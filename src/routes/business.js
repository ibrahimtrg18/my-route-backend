const express = require("express");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const request = require("request");
const { Client } = require("@googlemaps/google-maps-services-js");
const db = require("../config/database");
const router = express.Router();
const { isAuthBusiness } = require("../middleware/auth");
const client = new Client({});

router.post("/register", async (req, res) => {
  console.log(req.body);
  const {
    businessName,
    email,
    password,
    address,
    location: { lat, lng },
    phoneNumber,
  } = req.body;

  try {
    const emailValid = await validator.isEmail(email);
    if (emailValid) {
      const isEmailExist = await db("business").where(
        "email",
        email.toLowerCase()
      );
      if (isEmailExist.length === 0) {
        await db("business").insert({
          name: businessName,
          email: email.toLowerCase(),
          password,
          address,
          lat,
          lng,
          phone_number: phoneNumber,
        });
        return res.status(201).json({
          code: res.statusCode,
          success: true,
          message: "successfully created account",
        });
      } else {
        return res.status(409).json({
          code: res.statusCode,
          success: false,
          message: "email already exist!",
        });
      }
    } else {
      return res.status(406).json({
        code: res.statusCode,
        success: false,
        message: "email field must be an email",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: true,
      message: err,
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const rows = await db
    .select()
    .from("business")
    .where({ email: email.toLowerCase() });

  if (rows.length > 0) {
    if (rows[0].password == password) {
      rows[0].roles = "business";
      const token = await jwt.sign(
        { payload: rows[0] },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        code: res.statusCode,
        success: true,
        data: {
          accessToken: token,
        },
        message: "Successfully login!",
      });
    } else {
      return res.status(401).json({
        code: res.statusCode,
        success: false,
        message: "Password incorrect!, please try again...",
      });
    }
  } else {
    return res.status(401).json({
      code: res.statusCode,
      success: false,
      message: "This email does not exist!",
    });
  }
});

router.get("/settings", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;

  try {
    const rows = await db
      .select("*")
      .from("business")
      .where({ id: businessId });
    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        business: rows[0],
      },
      message: "found the account",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.put("/settings", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;
  const {
    businessName,
    phoneNumber,
    email,
    newPassword,
    prevPassword,
  } = req.body;

  try {
    const oldPassword = await db
      .select("password")
      .from("business")
      .where({ id: businessId });
    const isEmailInBusiness = await db
      .select("email")
      .from("business")
      .where({ email: email });
    const isEmailInEmployee = await db
      .select("email")
      .from("employee")
      .where({ email: email });
    console.log(isEmailInBusiness.length, isEmailInEmployee.length);
    if (isEmailInBusiness.length <= 1 && isEmailInEmployee.length === 0) {
      if (oldPassword[0].password === prevPassword) {
        await db("business").where({ id: businessId }).update({
          name: businessName,
          phone_number: phoneNumber,
          email,
          password: newPassword,
        });
        return res.status(200).json({
          code: res.statusCode,
          success: true,
          message: "successfully update business",
        });
      } else {
        return res.status(200).json({
          code: res.statusCode,
          success: false,
          message: "wrong previous password",
        });
      }
    } else {
      return res.status(409).json({
        code: res.statusCode,
        success: false,
        message: "email already exist",
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/location", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;

  try {
    const location = await db
      .select("lat", "lng")
      .from("business")
      .where({ id: businessId });
    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        location: location[0],
      },
      message: "succesfully get location",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/employee", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;

  try {
    const rowsEmployeesId = await db
      .select("employee_id")
      .from("business_employee")
      .where({ business_id: businessId });
    const rowsEmployees = await db
      .select("*")
      .from("employee")
      .whereIn(
        "id",
        rowsEmployeesId.map((employee) => {
          return employee.employee_id;
        })
      );

    // const employees = await db
    //   .select("*", "employee.id as id")
    //   .from("employee")
    //   .crossJoin("route", "employee.id", "route.employee_id")
    //   .leftJoin("route_destination", "route.id", "route_destination.route_id");

    const employee = await Promise.all(
      rowsEmployees.map(async (row) => {
        const routeByEmployee = await db
          .select("*")
          .from("route")
          .where({ employee_id: row.id });
        const routeOfDestinationByEmployee = await db
          .select("*")
          .from("route_destination")
          .whereIn(
            "route_id",
            routeByEmployee.map((route) => route.id)
          );
        const destinationByEmployee = await Promise.all(
          routeOfDestinationByEmployee.map(
            async (row) =>
              await db
                .select("*")
                .from("destination")
                .where({ id: row.destination_id })
          )
        );
        return {
          ...row,
          allRoute: routeByEmployee,
          allDestination: destinationByEmployee,
        };
      })
    );

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        employee: employee,
      },
      message: `Found employee ${employee.length}`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.post("/employee/register", isAuthBusiness, async (req, res) => {
  const { name, customId, email, password, phoneNumber, address } = req.body;
  const businessId = req.userId;

  try {
    const emailValid = await validator.isEmail(email);
    if (emailValid) {
      const isEmailInBusiness = await db
        .select("email")
        .from("business")
        .where({ email: email });
      const isEmailInEmployee = await db
        .select("email")
        .from("employee")
        .where({ email: email });
      if (isEmailInBusiness.length === 0 && isEmailInEmployee.length === 0) {
        const employeeId = await db("employee").insert({
          name,
          custom_id: customId.toLowerCase(),
          email: email.toLowerCase(),
          password,
          phone_number: phoneNumber,
          address,
        });
        await db("business_employee").insert({
          business_id: businessId,
          employee_id: employeeId,
        });
        return res.status(201).json({
          code: res.statusCode,
          success: true,
          message: "successfully created account",
        });
      } else {
        return res.status(409).json({
          code: res.statusCode,
          success: false,
          message: "email already exist",
        });
      }
    } else {
      return res.status(406).json({
        code: res.statusCode,
        success: true,
        message: "email field must be an email",
      });
    }
  } catch (err) {
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/employee/standby", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;

  try {
    const rowsEmployeesId = await db
      .select("employee_id")
      .from("business_employee")
      .where({ business_id: businessId });

    const rowsEmployeeStandby = await db
      .select("*")
      .from("employee")
      .whereIn(
        "id",
        rowsEmployeesId.map((employee) => employee.employee_id)
      )
      .andWhere({ status: 0 });

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        employee: rowsEmployeeStandby,
      },
      message: `Employee standby ${rowsEmployeeStandby.length}`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/employee/onway", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;

  try {
    const rowsEmployeesId = await db
      .select("employee_id")
      .from("business_employee")
      .where({ business_id: businessId });

    const rowsEmployeesOnWay = await db
      .select("*")
      .from("employee")
      .whereIn(
        "id",
        rowsEmployeesId.map((employee) => employee.employee_id)
      )
      .andWhere({ status: 1 });

    const results = await Promise.all(
      rowsEmployeesOnWay.map(async (emp) => {
        const employee = await emp;
        const route = await db
          .select("*")
          .from("route")
          .where({ employee_id: emp.id })
          .andWhere({ status: 0 });
        const destinationIds = await db
          .select("destination_id")
          .from("route_destination")
          .where({ route_id: route[0].id });
        const destination = await db
          .select("*")
          .from("destination")
          .whereIn(
            "id",
            destinationIds.map((dest) => dest.destination_id)
          );
        return {
          employee: {
            ...employee,
            route: { ...route[0], destination: destination },
          },
        };
      })
    );

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        employees: results,
      },
      message: `Employee on way ${rowsEmployeesOnWay.length}`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

router.post("/route", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;
  const { employeeId, destination } = req.body;

  try {
    const routeId = await db("route").insert({
      business_id: businessId,
      employee_id: employeeId,
    });

    const fieldDestinationToInsert = destination.map((dest) => ({
      route_id: routeId,
      destination_id: dest.id,
    }));

    await db("route_destination").insert(fieldDestinationToInsert);
    await db("destination")
      .whereIn(
        "id",
        destination.map((dest) => dest.id)
      )
      .update({ taken: 1 });
    await db("employee").where({ id: employeeId }).update({ status: 1 });

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      message: "successfully create destination of route",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/route/:routeId", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;
  const { routeId } = req.params;
  let locationSorted = [];
  let results = {};

  try {
    const locationBusiness = await db
      .select("lat", "lng")
      .from("business")
      .where({ id: businessId });

    const destination = await db
      .select("destination_id")
      .from("route_destination")
      .where({ route_id: routeId });

    const location = await db
      .select("lat", "lng")
      .from("destination")
      .whereIn(
        "id",
        destination.map((dest) => dest.destination_id)
      );

    location.unshift(locationBusiness[0]);

    const r = await client.distancematrix({
      params: {
        origins: location.map((loc) => {
          return {
            lat: loc.lat,
            lng: loc.lng,
          };
        }),
        destinations: location.map((loc) => {
          return {
            lat: loc.lat,
            lng: loc.lng,
          };
        }),
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 1000,
    });

    var distanceTotal = 0;
    r.data.rows.forEach((row, i) => {
      let distanceValue = {};
      row.elements.forEach((el, j) => {
        distanceValue[(j + 10).toString(36).toUpperCase()] = el.distance.value;
        if (i === 0) distanceTotal += distanceTotal + el.distance.value;
      });
      results[(i + 10).toString(36).toUpperCase()] = distanceValue;
    });

    await request.get(
      "http://localhost:5000/findbestroute",
      {
        form: {
          cities: Object.keys(results).join(","),
          start_city: "A",
          distance_matrix: JSON.stringify(results),
        },
      },
      function (error, response, body) {
        try {
          if (error) {
            console.log(error);
          } else {
            var route = JSON.parse(response.body);
            let sortLocation = [];
            location.forEach((loc, i) => {
              sortLocation[route.route[i].charCodeAt(0) - 65] = {
                lat: location[i].lat,
                lng: location[i].lng,
              };
              return (locationSorted = sortLocation);
            });
            // sortLocation.push(sortLocation[sortLocation.length - 1]);
          }
          return res.status(200).json({
            distanceTotal: route.total_distance,
            results,
            route: JSON.parse(response.body),
            location,
            locationSorted,
          });
        } catch (err) {
          console.log(err);
          return res.status(200).json({
            distanceTotal,
            location,
          });
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
});

router.put("/route/:routeId", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;
  const { routeId } = req.params;
  const { destination } = req.body;

  try {
    const fieldDestinationToInsert = destination.map((dest) => ({
      route_id: routeId,
      destination_id: dest.id,
    }));

    await db("route_destination").insert(fieldDestinationToInsert);
    await db("destination")
      .whereIn(
        "id",
        destination.map((dest) => dest.id)
      )
      .update({ taken: 1 });
    return res.status(200).json({
      code: res.statusCode,
      success: true,
      message: `successfully add destination of route ${routeId}`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get(
  "/employee/:employeeId/route/:routeId",
  isAuthBusiness,
  async (req, res) => {
    const businessId = req.userId;
    const { employeeId, routeId } = req.params;

    try {
      const rowsDestination = await db
        .select("destination_id as destinationId")
        .from("route_destination")
        .where({ route_id: routeId });
      const results = await db
        .select("*")
        .from("destination")
        .whereIn(
          "id",
          rowsDestination.map((dest) => dest.destinationId)
        );

      return res.status(200).json({
        code: res.statusCode,
        success: true,
        data: {
          destination: results,
        },
        message: `destination ${results.length}`,
      });
    } catch (err) {
      console.log(err);
    }
  }
);

router.delete(
  "/route/:routeId/destination/:destinationId",
  isAuthBusiness,
  async (req, res) => {
    const { routeId, destinationId } = req.params;
    console.log(routeId);

    try {
      await db("route_destination")
        .where({ route_id: routeId, destination_id: destinationId })
        .delete();
      await db("destination").where({ id: destinationId }).delete();

      const rowsRoute = await db
        .select("*")
        .from("route_destination")
        .where({ route_id: routeId });

      if (rowsRoute.length == 0) {
        const employee = await db
          .select("employee_id")
          .from("route")
          .where({ id: routeId });

        await db("route").where({ id: routeId }).delete();
        await db("employee")
          .where({ id: employee[0].employee_id })
          .update({ status: "0" });
      }

      return res.status(200).json({
        code: res.statusCode,
        success: true,
        message: "successfully delete destination of route",
      });
    } catch (err) {
      console.log(err);
    }
  }
);

router.get("/destination", isAuthBusiness, async (req, res) => {
  const businessId = req.userId;

  try {
    const rowsDestination = await db
      .select("*")
      .from("destination")
      .where({ business_id: businessId, taken: 0 });

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        destination: rowsDestination,
      },
      message: `found ${rowsDestination.length} destination`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.post("/destination", isAuthBusiness, async (req, res) => {
  const {
    address,
    coordinate: { lat, lng },
    zipCode,
    phoneNumber,
    itemId,
    email,
  } = req.body;
  const businessId = req.userId;

  try {
    await db("destination").insert({
      business_id: businessId,
      lat,
      lng,
      zip_code: zipCode,
      order_id: itemId,
      order_address: address,
      order_email: email,
      order_phone_number: phoneNumber,
    });

    return res.status(200).json({
      code: res.statusCode,
      success: false,
      message: "successfully create destination",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/history", isAuthBusiness, async (_req, _res) => {});

module.exports = router;
