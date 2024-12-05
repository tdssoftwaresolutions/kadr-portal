const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.SECRET_KEY
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY
const SIGN_SECRET_KEY = process.env.SIGN_SECRET_KEY
const nodemailer = require('nodemailer')
const crypto = require('crypto')

class Helper {
  static generateRandomPassword (length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      password += chars[randomIndex]
    }

    return password
  }

  static async hashPassword (password) {
    const saltRounds = 10 // You can adjust the number of salt rounds for more security
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    return hashedPassword
  }

  static async comparePassword (enteredPassword, storedHash) {
    const isMatch = await bcrypt.compare(enteredPassword, storedHash)
    return isMatch
  }

  static verifyToken (token, secretKey) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secretKey, (err, user) => {
        if (err) {
          reject(new Error('Invalid or expired token'))
        } else {
          resolve(user) // Resolving with the decoded user object
        }
      })
    })
  }

  static async getUserFromToken (authToken) {
    const token = authToken?.split(' ')[1] // Extract the token from the Authorization header
    if (!token) {
      return { error: 'No token provided' }
    }
    try {
      const user = await this.verifyToken(token, SECRET_KEY)
      const userData = {
        'id': user.id,
        'type': user.type
      }
      const signature = this.signResponseData(userData)
      return {
        userData,
        signature
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      return { error: 'Invalid or expired token' }
    }
  }

  static verifySignature (data, signature) {
    // Create a new signature based on the data and compare it with the received signature
    const newSignature = this.signResponseData(data)
    return newSignature === signature
  }

  static signResponseData (data) {
    // Convert the data to a string, then hash it with the secret key
    const dataString = JSON.stringify(data)
    const signature = crypto.createHmac('sha256', SIGN_SECRET_KEY)
      .update(dataString)
      .digest('hex')
    return signature
  }

  static generateAccessToken (user) {
    return jwt.sign({ id: user.id, email: user.email, type: user.user_type }, SECRET_KEY, { expiresIn: '1d' })
  }

  static generateRefreshToken (user) {
    return jwt.sign({ id: user.id, email: user.email, type: user.user_type }, REFRESH_SECRET_KEY, { expiresIn: '30d' })
  }

  static async sendEmail (emailId, htmlBody) {
    try {
      // Create a transporter
      const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com', // Replace with your SMTP server
        port: 465, // Use 587 for TLS or 465 for SSL
        secure: true, // True for SSL, false for TLS
        auth: {
          user: process.env.EMAIL_USER, // Your full email address
          pass: process.env.EMAIL_PASSWORD // Your email password
        }
      })
      // Email details
      const mailOptions = {
        from: process.env.EMAIL_USER, // Sender's email address
        to: emailId, // Recipient's email address
        subject: 'Mediation Request Initiated', // Subject line
        html: htmlBody
      }

      // Send the email
      const info = await transporter.sendMail(mailOptions)
      console.log('Email sent: ' + info.response)

      // Send a response to the client
      return { message: 'Email sent successfully', info: info.response }
    } catch (error) {
      return { message: 'Failed to send email', error }
    }
  }
}

module.exports = Helper