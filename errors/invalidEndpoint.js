function invalidEndpoint(request, response) {
  response.status(404).json({
    error: "unknown endpoint",
  });
}

module.exports = invalidEndpoint;
