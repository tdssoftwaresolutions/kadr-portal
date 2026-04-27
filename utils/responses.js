exports.success = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  })
}

exports.error = (res, errorObj, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: errorObj
  })
}
