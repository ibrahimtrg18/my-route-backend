const express = require("express");
const db = require("../config/database");
const router = express.Router();

router.get("/business", async (req, res) => {
  try {
    const rowsBusiness = await db.select("*").from("business");

    const rowsBusinessEmployee = await Promise.all(
      rowsBusiness.map(async (bus) => {
        const employeeId = await db
          .select("employee_id")
          .from("business_employee")
          .where({ business_id: bus.id });
        const rowsEmployee = await db
          .select("*")
          .from("employee")
          .whereIn(
            "id",
            employeeId.map((emp) => emp.employee_id)
          );
        return {
          ...bus,
          employee: rowsEmployee,
        };
      })
    );

    console.log(rowsBusinessEmployee);

    return res.status(200).json({
      code: res.statusCode,
      success: true,
      data: {
        business: rowsBusinessEmployee,
      },
      message: `Found ${rowsBusiness.length} business`,
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

module.exports = router;
