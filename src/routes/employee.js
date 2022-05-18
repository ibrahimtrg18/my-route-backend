const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("request");
const db = require("../config/database");
const router = express.Router();
const { Client } = require("@googlemaps/google-maps-services-js");
const { isAuthEmployee } = require("../middleware/auth");
const client = new Client({});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const rows = await db
      .select()
      .from("employee")
      .where({ email: email.toLowerCase() });

    if (rows.length > 0) {
      if (rows[0].password == password) {
        rows[0].roles = "employee";
        const token = jwt.sign(
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
  } catch (err) {
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/profile", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;

  try {
    const rows = await db
      .select("*")
      .from("employee")
      .where({ id: employeeId });
    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        employee: rows[0],
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

router.put("/profile", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;
  const { name, phoneNumber, address } = req.body;

  try {
    await db("employee")
      .update({ name, phone_number: phoneNumber, address })
      .where({ id: employeeId });
    return res.status(200).json({
      code: res.statusCode,
      success: true,
      message: "successfully update profile",
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

router.get("/status", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;

  try {
    const employeeStatus = await db
      .select("status")
      .from("employee")
      .where({ id: employeeId });

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        employee: employeeStatus[0],
      },
    });
  } catch (err) {
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.patch("/status", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;

  try {
    const employeeStatus = await db
      .select("status")
      .from("employee")
      .where({ id: employeeId });

    await db("employee")
      .update({ status: !employeeStatus[0].status })
      .where({ id: employeeId });

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      message: `successfully change the status to ${
        !employeeStatus[0].status ? "on way" : "standby"
      }`,
    });
  } catch (err) {
    return res.status(500).json({
      code: res.statusCode,
      success: false,
      message: err,
    });
  }
});

router.get("/destination", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;

  try {
    const routeId = await db
      .select("id")
      .from("route")
      .where({ employee_id: employeeId, status: 0 });
    if (routeId.length > 0) {
      const destinationsId = await db
        .select("destination_id")
        .from("route_destination")
        .where({ route_id: routeId[0].id });
      const destinations = await db
        .select("*")
        .from("destination")
        .where({ status: 0 })
        .whereIn(
          "id",
          destinationsId.map((dest) => dest.destination_id)
        );
      return res.status(200).json({
        code: res.statusCode,
        success: true,
        data: {
          routeId: routeId[0].id,
          destination: destinations,
        },
        message: `found ${destinations.length}`,
      });
    } else {
      return res.status(204).json({
        code: res.statusCode,
        success: true,
        data: {
          routeId: null,
          destination: [],
        },
        message: `you status is standby`,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

router.put(
  "/destination/:destinationId/finish",
  isAuthEmployee,
  async (req, res) => {
    const employeeId = req.userId;
    const { destinationId } = req.params;

    try {
      const routeId = await db
        .select("id")
        .from("route")
        .where({ employee_id: employeeId });

      const destinationsId = await db
        .select("destination_id")
        .from("route_destination")
        .where({ route_id: routeId[0].id });

      const fit = destinationsId.find((dest) => {
        return dest.destination_id == destinationId;
      });

      if (fit) {
        const totalDestination = await db("destination")
          .where({ id: destinationId })
          .update({ status: 1 });

        const destinationStatus = await db
          .select("status")
          .from("destination")
          .whereIn(
            "id",
            destinationsId.map((dest) => dest.destination_id)
          );

        console.log(totalDestination);

        const isThereLeft = destinationStatus.find((dest) => dest.status === 0);

        if (!isThereLeft) {
          await db("route")
            .where({ employee_id: employeeId })
            .update({ status: 1 });

          await db("employee").where({ id: employeeId }).update({ status: 0 });

          const rowsHistoryRoutesId = await db
            .select("route_id")
            .from("history")
            .where({ employee_id: employeeId });

          const alreadyInHistory = await rowsHistoryRoutesId.find(
            (route) => route.route_id === routeId[0].id
          );

          if (!alreadyInHistory) {
            await db("history").insert({
              employee_id: employeeId,
              route_id: routeId[0].id,
            });
          } else {
            return res.status(205).json({
              code: res.statusCode,
              success: true,
              message: "refresh please...",
            });
          }
        }

        return res.status(200).json({
          code: res.statusCode,
          success: true,
          message: "successfully change status destination",
        });
      } else {
        return res.status(403).json({
          code: res.statusCode,
          success: false,
          message: "its not your destination",
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).send(err);
    }
  }
);

router.get("/route", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;

  try {
    const routeId = await db
      .select("id")
      .from("route")
      .where({ employee_id: employeeId });
    if (routeId.length > 0) {
      return res.status().json({ code: res.statusCode });
    } else {
      return res.status(204).json({
        code: res.statusCode,
        success: true,
        data: {
          routeId: null,
        },
        // message: ""
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

router.get("/route/:routeId", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;
  const { routeId } = req.params;
  let locationSorted = [];
  let results = {};

  try {
    const rowsEmployee = await db
      .select("lat", "lng")
      .from("employee")
      .where({ id: employeeId });

    const locationEmployee =
      rowsEmployee[0].lat && rowsEmployee[0].lng ? rowsEmployee : false;

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

    const rowsRouteBusinessId = await db
      .select("business_id")
      .from("route")
      .where({ id: routeId });

    const locationBusiness = await db
      .select("lat", "lng")
      .from("business")
      .where({ id: rowsRouteBusinessId[0].business_id });

    location.unshift(locationEmployee[0] || locationBusiness[0]);

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
    return res.status(500).send(err);
  }
});

router.get("/history", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;

  const rows = await db
    .select("history.id", "route.id as route_id", "history.created_at")
    .from("history")
    .where("history.employee_id", employeeId)
    .leftJoin("route", "history.route_id", "route.id");

  return res.status(200).json({
    data: rows,
  });
});

router.put("/location", isAuthEmployee, async (req, res) => {
  const employeeId = req.userId;
  const { lat, lng } = req.body;

  try {
    await db("employee").where({ id: employeeId }).update({ lat, lng });

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      message: "successfully change coordinate employee",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

module.exports = router;
