require("dotenv").config();
const app = require("express")();
const bodyParser = require("body-parser");
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const {
  createTableBusiness,
  createTableBusinessEmployee,
  createTableEmployee,
  createTableRoute,
  createTableRouteDestination,
  createTableDestination,
  createTableHistory,
} = require("./config/schema");

(async function () {
  await createTableBusiness();
  await createTableEmployee();
  await createTableBusinessEmployee();
  await createTableRoute();
  await createTableDestination();
  await createTableRouteDestination();
  await createTableHistory();
  console.log("databases ready...");

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cors());

  app.use("/", require("./routes/index"));

  app.listen(PORT, () => console.log(`Server is running at ${PORT}`));
})();
