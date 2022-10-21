function errorHandler(error, request, response, next) {
  // logger.error(error);
  if (error.name === "ValidationError") {
    return response.status(400).json({
      error: error.message.split(":")[0].replace(/['"]/g, ""),
      message: "Invalid request data. Please review request and retry again",
      success: false,
    });
  }
  if (error.name === "CastError") {
    return response.status(404).json({
      success: false,
      message: "The vcard the specified ID not found",
      error,
    });
  }
  if (error.name === "MongooseError") {
    return response.status(500).json({
      success: false,
      message: "An error occured",
      error: error.message,
    });
  }
  if (error.name === "JsonWebTokenError") {
    return response.status(401).json({
      success: false,
      message: "Invalid request data. Please review and retry again",
      error,
    });
  }
  return next(error);
}

module.exports = errorHandler;
