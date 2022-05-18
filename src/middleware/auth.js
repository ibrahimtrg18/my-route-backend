const { request, response } = require("express");
const jwt = require("jsonwebtoken");

module.exports = {
  /**
   * @param {request} req
   * @param {response} res
   */
  isAuthBusiness: async (req, res, next) => {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({
        code: res.statusCode,
        success: false,
        message: "token required",
      });
    }

    try {
      const { payload } = await jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );
      if (payload.roles === "business") {
        req.userId = payload.id;
        next();
      } else {
        return res.status(403).json({
          code: res.statusCode,
          success: false,
          message: "token invalid",
        });
      }
    } catch (err) {
      return res.status(403).json({
        code: res.statusCode,
        success: false,
        message: err.message,
      });
    }
  },
  /**
   * @param {request} req
   * @param {response} res
   */
  isAuthEmployee: async (req, res, next) => {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({
        code: res.statusCode,
        success: false,
        message: "token required",
      });
    }

    try {
      const { payload } = await jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      );
      if (payload.roles == "employee") {
        req.userId = payload.id;
        next();
      } else {
        return res.status(403).json({
          code: res.statusCode,
          success: false,
          message: "token invalid",
        });
      }
    } catch (err) {
      return res.status(403).json({
        code: res.statusCode,
        success: false,
        message: err.message,
      });
    }
  },
};
