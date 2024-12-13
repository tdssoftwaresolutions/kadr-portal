const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const helper = require('../helper')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const clientId = process.env.ZOOM_CLIENT_ID
const clientSecret = process.env.ZOOM_CLIENT_SECRET
const accountId = process.env.ZOOM_ACCOUNT_ID
const errorCodes = require('../errorCodes')
const { google } = require('googleapis')
const { v4: uuidv4 } = require('uuid')
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

module.exports = {
  getDashboardContent: async function (req, res) {
    try {
      const userDetails = req.user
      let dashboardContent = {}
      const user = await prisma.user.findUnique({
        where: {
          id: userDetails.id
        }
      })
      if (!user) {
        res.json(errorCodes.USER_NOT_FOUND)
      }

      if (user.user_type === 'ADMIN') {
        const inactiveUsers = await helper.getInactiveUsers(prisma, 1, 'CLIENT', 'cases_cases_first_partyTouser')
        const inactiveMediators = await helper.getInactiveUsers(prisma, 1, 'MEDIATOR', 'cases_cases_mediatorTouser')
        const counts = await prisma.$transaction([
          prisma.cases.count(),
          prisma.user.count({
            where: {
              user_type: 'CLIENT'
            }
          }),
          prisma.user.count({
            where: {
              user_type: 'MEDIATOR'
            }
          })
        ])
        const totalCases = counts[0]
        const clientUsers = counts[1]
        const mediatorUsers = counts[2]
        dashboardContent.inactive_users = inactiveUsers
        dashboardContent.inactive_mediators = inactiveMediators
        dashboardContent.count = {
          cases: totalCases,
          clients: clientUsers,
          mediators: mediatorUsers
        }
      } else if (user.user_type === 'MEDIATOR') {
        const [notes, casesWithEvents] = await Promise.all([
          prisma.notes.findMany({
            where: {
              user_id: userDetails.id
            },
            select: {
              note_text: true
            },
            orderBy: {
              created: 'desc'
            }
          }),
          prisma.cases.findMany({
            where: {
              mediator: userDetails.id
            },
            select: {
              id: true,
              events: {}
            }
          })
        ])
        dashboardContent.myCases = casesWithEvents
        dashboardContent.notes = notes
      } else if (user.user_type === 'CLIENT') {
        const cases = await prisma.cases.findMany({
          where: {
            OR: [
              { first_party: userDetails.id },
              { second_party: userDetails.id }
            ]
          },
          select: {
            id: true
          }
        })
        if (cases.length === 0) {
          return res.json(errorCodes.CASES_NOT_FOUND)
        }
        const casesWithEvents = await prisma.cases.findMany({
          where: {
            mediator: userDetails.id
          },
          include: {
            events: {
              where: {
                case_id: {
                  in: cases.map(c => c.id)
                }
              }
            }
          }
        })
        dashboardContent.myCases = casesWithEvents
        dashboardContent.cases = cases
      }

      res.json({ success: true, dashboardContent })
    } catch (error) {
      res.json(errorCodes.INVALID_REQUEST)
      console.error('Error fetching user:', error)
    } finally {
      await prisma.$disconnect()
    }
  },
  getInactiveUsers: async function (req, res) {
    const type = req.query.type
    const relationField = type === 'CLIENT' ? 'cases_cases_first_partyTouser' : 'cases_cases_mediatorTouser'
    const inactiveUsers = await helper.getInactiveUsers(prisma, req.query.page, type, relationField)
    res.json({ success: true, inactiveUsers })
  },
  logout: function (req, res) {
    // Clear the refresh token cookie
    try {
      res.clearCookie('refresh_token', {
        httpOnly: true, // Make sure it's HTTP-only
        secure: true, // Secure cookie in production
        sameSite: 'None', // For cross-origin cookies (if needed)
        path: '/' // Ensure to clear the cookie from the same path
      })
    } catch (e) {
      console.log('Cookie couldn\'t be cleared, trying with Set-Cookie header for serverless')
      // Set-Cookie header to expire the refresh_token cookie
      res.setHeader('Set-Cookie', 'refresh_token=; Max-Age=0; Path=/; Secure=true; SameSite=None')
    }

    // Optionally send a response indicating the user has been logged out
    return res.status(200).json({ message: 'Logged out successfully' })
  },
  updateInactiveUser: async function (req, res) {
    const { isActive, caseId, userId, caseType } = req.body
    const generatedPassword = helper.generateRandomPassword()
    const hashPassword = await helper.hashPassword(generatedPassword)
    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        active: isActive,
        password_hash: hashPassword
      },
      select: {
        name: true,
        email: true,
        phone_number: true
      }
    })
    if (caseId) {
      await prisma.cases.update({
        where: {
          id: caseId
        },
        data: {
          case_type: caseType
        }
      })
    }
    const htmlBody = `
              <p>Hi ${updatedUser.name}, thanks for registering on KADR.live. Your account is now active.</p>
              <p>To login, use below credentials:</p> <br/>
              <p>Username : ${updatedUser.email}</p> <br/>
              <p>Password : ${generatedPassword} <p>`
    await helper.sendEmail(updatedUser.email, htmlBody)
    res.json({ success: true, message: 'User updated successfully.' })
  },
  scheduleMeeting: async function (req, res) {
    try {
      const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`
      const response = await axios.post(
        tokenUrl, '',
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
      const accessToken = response.data.access_token
      const meetingData = {
        topic: 'Team Sync Meeting',
        type: 2,
        start_time: '2024-12-10T10:00:00Z',
        duration: 30,
        timezone: 'UTC',
        contact_email: 'tarandeep.s.saini@gmail.com',
        meeting_invitees: [
          {
            'email': 'tarandeep.s.saini@gmail.com'
          }
        ],
        attendees: [
          {
            'email': 'tarandeep.s.saini@gmail.com'
          }
        ],
        agenda: 'Discuss team updates and project milestones',
        settings: {
          host_video: true,
          participant_video: true,
          audio: 'voip',
          auto_recording: 'none',
          alternative_hosts: '',
          send_notification: true
        }
      }
      const response1 = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        meetingData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      const meetingLink = response1.data.join_url
      res.json({
        message: 'Meeting created successfully!',
        meetingLink,
        meetingId: response1.data.id
      })
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message)
    }
  },
  googleCallback: async function (req, res) {
    const code = decodeURIComponent(req.query.code)
    const state = req.query.state
    try {
      const { tokens } = await oauth2Client.getToken(code)
      console.log(tokens)
      await prisma.user.update({
        where: {
          id: state
        },
        data: {
          google_token: JSON.stringify(tokens)
        }
      })
      res.send('<html><body><h1>Your Google account is now connected. You can now close this window and return to the app.</h1></body></html>')
    } catch (e) {
      console.error('Error retrieving access token', e)
      res.status(500).send('Authentication failed')
    }
  },
  isEmailExist: async function (req, res) {
    const user = await prisma.user.findUnique({
      where: {
        email: req.query.email
      }
    })
    if (user) {
      res.json({ success: true })
    } else {
      res.json(errorCodes.NOT_FOUND)
    }
  },
  getAvailableLanguages: async function (req, res) {
    const availableLanguages = await prisma.available_languages.findMany()
    res.json(availableLanguages)
  },
  confirmPasswordChange: async function (req, res) {
    const { emailAddress, otp, password } = req.body
    const otpReset = await prisma.otp_resets.findUnique({
      where: {
        email: emailAddress
      },
      select: {
        otp: true,
        expires_at: true
      }
    })
    if (otpReset) {
      if (Number(otpReset.otp) !== Number(otp)) {
        res.status(401).json(errorCodes.INVALID_OTP)
        return
      }
      if (otpReset.expires_at < new Date()) {
        res.status(401).json(errorCodes.OTP_EXPIRED)
        return
      }
      const hashPassword = await helper.hashPassword(password)
      await prisma.user.update({
        where: {
          email: emailAddress
        },
        data: {
          password_hash: hashPassword
        }
      })
      await prisma.otp_resets.delete({
        where: {
          email: emailAddress
        }
      })
      res.status(201).json({ success: true, message: 'Password reset successfully.' })
    } else {
      res.status(401).json(errorCodes.INVALID_REQUEST)
    }
  },
  resetPassword: async function (req, res) {
    const email = req.body.emailAddress
    const user = await prisma.user.findUnique({
      where: {
        email
      },
      select: {
        id: true
      }
    })
    if (user) {
      const createdAt = new Date()
      const expiresAt = new Date(createdAt.getTime() + 10 * 60000)
      const otp = Math.floor(100000 + Math.random() * 900000)
      await prisma.otp_resets.upsert({
        where: {
          email // Check if OTP already exists for this email
        },
        update: {
          otp, // Update OTP
          created_at: createdAt, // Update created time
          expires_at: expiresAt // Update expiration time
        },
        create: {
          email, // Insert the email if doesn't exist
          otp, // Insert the OTP
          created_at: createdAt, // Insert created time
          expires_at: expiresAt // Insert expiration time
        }
      })
      const htmlBody = `
                    <p>Hi, we have recieved your request to reset password for your account on kADR.live.</p>
                    <p>To go ahead with this, please enter OTP: ${otp} on our platform to reset the password</p>
                  `
      await helper.sendEmail(email, htmlBody)
    }
    res.json({ success: true })
  },
  newCalendarEvent: async function (req, res) {
    try {
      const { id, title, description, start, end, type, caseId } = req.body
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id
        },
        select: {
          google_token: true
        }
      })
      oauth2Client.setCredentials(JSON.parse(user.google_token))
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      const event = {
        summary: title,
        description,
        start: { dateTime: start, timeZone: 'Asia/Kolkata' },
        end: { dateTime: end, timeZone: 'Asia/Kolkata' },
        attendees: [
          { email: 'tarandeepsync@gmail.com' },
          { email: 'mebonixservices@gmail.com' },
          { email: 'support@mebonix.in' }
        ],
        conferenceData: {
          createRequest: {
            requestId: id,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      })
      await prisma.events.create({
        data: {
          title: 'Event Title',
          description: 'Event Description',
          start_datetime: start,
          end_datetime: end,
          type,
          meeting_link: response.data.conferenceData.entryPoints[0].uri,
          google_calendar_link: response.data.htmlLink,
          created_by: req.user.id,
          case_id: caseId
        }
      })
      res.send({
        message: 'Event created successfully',
        eventLink: response.data.htmlLink,
        meetLink: response.data.conferenceData.entryPoints[0].uri
      })
    } catch (err) {
      console.error('Error retrieving access token', err)
      res.status(500).send('Authentication failed')
    }
  },
  authenticateWithGoogle: async function (req, res) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    )

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar'
    ]

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: req.user.id
    })

    res.json({ success: true, url })
  },
  generatePassword: async function (req, res) {
    const generatedPassword = helper.generateRandomPassword()
    console.log(generatedPassword)
    const hashPassword = await helper.hashPassword(generatedPassword)
    console.log(hashPassword)
    res.json({ success: true })
  },
  sendEmail: async function (req, res) {
    const htmlBody = `
                <p>Hi ${req.params.name}, Someone has initiated a mediation request with you.</p>
                <p>To go ahead with this, please click on the link below to get started with your account:</p>
                <p><a href="https://www.kadr.live/get-started" target="_blank">Get Started</a></p>
              `
    await helper.sendEmail(req.params.email, htmlBody)
  },
  newUserSignup: async function (req, res) {
    try {
      const { name, email, phone, city, state, pincode, description, category, preferredLanguage, evidenceContent, oppositeName, oppositeEmail, oppositePhone } = req.body.userDetails
      const uploadedFileResponse = await helper.uploadFile(evidenceContent, `evidence-${uuidv4()}`)
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone_number: phone,
          password_hash: '',
          user_type: 'CLIENT',
          active: false,
          city,
          state,
          preferred_languages: JSON.stringify([preferredLanguage]),
          pincode,
          is_self_signed_up: true
        }
      })
      const oppositePartyUser = await prisma.user.upsert({
        where: {
          email: oppositeEmail
        },
        update: {

        },
        create: {
          name: oppositeName,
          email: oppositeEmail,
          phone_number: oppositePhone,
          password_hash: '',
          is_self_signed_up: false,
          user_type: 'CLIENT',
          active: false
        }
      })

      const tracker = await prisma.caseIdTracker.findFirst()
      let newCaseId = 1
      if (tracker) {
        newCaseId = tracker.lastCaseId + 1
      }

      await prisma.cases.create({
        data: {
          first_party: user.id,
          second_party: oppositePartyUser.id,
          evidence_document_url: uploadedFileResponse.stored_url,
          description,
          category,
          caseId: `KDR-${newCaseId}`
        }
      })

      await prisma.caseIdTracker.upsert({
        where: { id: 1 },
        update: { lastCaseId: newCaseId },
        create: { lastCaseId: newCaseId }
      })

      const htmlBody = `<p>Hi ${name}, thanks for registering on KADR.live. Your account is under review, and you'll be notified once approved by the KADR team.</p>`
      await helper.sendEmail(email, htmlBody)

      res.status(201).json({
        message: 'User created successfully! Your account is under review, and you\'ll be notified once approved by the KADR team.'
      })
    } catch (error) {
      console.log(error)
      if (error.code === 'P2002' && error.meta.target.includes('email')) {
        res.status(201).json(errorCodes.YOU_USER_ALREADY_EXISTS)
      } else {
        res.status(500).json(errorCodes.INVALID_REQUEST)
      }
    }
  },
  newMediatorSignup: async function (req, res) {
    try {
      const { name, email, phone, city, state, pincode, preferredLanguages, llbCollege, llbUniversity, llbYear, mediatorCourseYear, mcpcCertificateContent, preferredAreaOfPractice, selectedHearingTypes, barEnrollmentNo } = req.body.userDetails

      let uploadedFileResponse = null
      if (mcpcCertificateContent) { uploadedFileResponse = await helper.uploadFile(mcpcCertificateContent, `mcpc-certificate-${uuidv4()}`) }

      await prisma.user.create({
        data: {
          name,
          email,
          phone_number: phone,
          password_hash: '',
          user_type: 'MEDIATOR',
          active: false,
          city,
          state,
          preferred_languages: JSON.stringify(preferredLanguages),
          pincode,
          is_self_signed_up: true,
          llb_college: llbCollege,
          llb_university: llbUniversity,
          llb_year: llbYear,
          mediator_course_year: mediatorCourseYear,
          mcpc_certificate_url: uploadedFileResponse ? uploadedFileResponse.stored_url : '',
          preferred_area_of_practice: preferredAreaOfPractice,
          selected_hearing_types: JSON.stringify(selectedHearingTypes),
          bar_enrollment_no: barEnrollmentNo
        }
      })

      await helper.addLanguagesToDatabase(preferredLanguages, prisma)

      const htmlBody = `<p>Hi ${name}, thanks for registering on KADR.live. Your account is under review, and you'll be notified once approved by the KADR team.</p>`
      await helper.sendEmail(email, htmlBody)

      res.status(201).json({
        message: 'User created successfully! Your account is under review, and you\'ll be notified once approved by the KADR team.'
      })
    } catch (error) {
      console.log(error)
      if (error.code === 'P2002' && error.meta.target.includes('email')) {
        res.status(201).json(errorCodes.YOU_USER_ALREADY_EXISTS)
      } else {
        res.status(500).json(errorCodes.INVALID_REQUEST)
      }
    }
  },
  login: async function (req, res) {
    const { username, password } = req.body
    const user = await prisma.user.findFirst({
      where: {
        email: username
      }
    })
    if (!user) {
      res.status(401).json(errorCodes.INVALID_CREDENTIALS)
      return
    }
    if (user.active === false) {
      res.status(403).json(errorCodes.USER_NOT_ACTIVE)
      return
    }
    const isPasswordValid = await helper.comparePassword(password, user.password_hash)
    if (!isPasswordValid) {
      res.status(401).json(errorCodes.INVALID_CREDENTIALS)
      return
    }

    const accessToken = helper.generateAccessToken(user)
    const refreshToken = helper.generateRefreshToken(user)
    try {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true, // Cookie is inaccessible to JavaScript on the client-side
        secure: true, // Ensure the cookie is secure in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'None', // Allow cross-origin cookies (if necessary)
        path: '/'
      })
    } catch (e) {
      console.log('Cookied couldnt set, trying with setHeader')
      res.setHeader('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Max-Age=604800000; Path=/; Secure=true`)
    }
    res.status(201).json({ accessToken })
  },
  getUserData: async function (req, res) {
    const userData = {
      'id': req.user.id,
      'type': req.user.type,
      'name': req.user.name,
      'email': req.user.email
    }
    const signature = helper.signResponseData(userData)
    res.json({
      userData,
      signature
    })
  },
  verifySignature: function (req, res) {
    const { userData, signature } = req.body
    if (helper.verifySignature(userData, signature)) {
      res.json({ valid: true })
    } else {
      res.status(401).json(errorCodes.UNAUTHORIZED)
    }
  },
  refreshToken: function (req, res) {
    const refreshToken = req.cookies.refresh_token
    if (!refreshToken) {
      return res.status(401).json(errorCodes.NO_REFRESH_TOKEN)
    }

    jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json(errorCodes.REFRESH_TOKEN_EXPIRED)
      }
      const newAccessToken = helper.generateAccessToken(user)

      res.json({ accessToken: newAccessToken })
    })
  }
}
