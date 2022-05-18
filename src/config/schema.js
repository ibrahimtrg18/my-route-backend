const db = require("./database");

module.exports = {
  createTableBusiness: function () {
    return db.schema
      .hasTable("business")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("business", (table) => {
            table.increments("id").primary();
            table.string("name").notNullable();
            table.string("email").notNullable();
            table.string("password").notNullable();
            table.string("phone_number").notNullable();
            table.string("address");
            table.decimal("lat", 8, 6);
            table.decimal("lng", 9, 6);
            table.timestamps(true, true);
            return console.log("table business successfully created");
          });
        } else {
          return console.log("table business already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
  createTableBusinessEmployee: function () {
    return db.schema
      .hasTable("business_employee")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("business_employee", (table) => {
            table.increments("id").primary();
            table
              .integer("business_id")
              .unsigned()
              .references("id")
              .inTable("business");
            table
              .integer("employee_id")
              .unsigned()
              .references("id")
              .inTable("employee");
            table.timestamps(true, true);
            return console.log("table business_employee successfully created");
          });
        } else {
          return console.log("table business_employee already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
  createTableEmployee: function () {
    return db.schema
      .hasTable("employee")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("employee", (table) => {
            table.increments("id").primary();
            table.string("name").notNullable();
            table.string("custom_id").notNullable();
            table.string("email").notNullable();
            table.string("password").notNullable();
            table.string("phone_number").notNullable();
            table.string("address");
            table.decimal("lat", 8, 6);
            table.decimal("lng", 9, 6);
            table.integer("status").defaultTo(0);
            table.integer("total_route", 11).defaultTo(0);
            table.integer("total_distance", 11).defaultTo(0);
            table.timestamps(true, true);
            return console.log("table employee successfully created");
          });
        } else {
          return console.log("table employee already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
  createTableRoute: function () {
    return db.schema
      .hasTable("route")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("route", (table) => {
            table.increments("id").primary();
            table
              .integer("business_id")
              .unsigned()
              .references("id")
              .inTable("business");
            table
              .integer("employee_id")
              .unsigned()
              .references("id")
              .inTable("employee");
            table.integer("status").defaultTo(0);
            table.timestamps(true, true);
            return console.log("table route successfully created");
          });
        } else {
          return console.log("table route already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
  createTableRouteDestination: function () {
    return db.schema
      .hasTable("route_destination")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("route_destination", (table) => {
            table.increments("id").primary();
            table
              .integer("route_id")
              .unsigned()
              .references("id")
              .inTable("route");
            table
              .integer("destination_id")
              .unsigned()
              .references("id")
              .inTable("destination");
            table.timestamps(true, true);
            return console.log("table route_destination successfully created");
          });
        } else {
          return console.log("table route_destination already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
  createTableDestination: function () {
    return db.schema
      .hasTable("destination")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("destination", (table) => {
            table.increments("id").primary();
            table
              .integer("business_id")
              .unsigned()
              .references("id")
              .inTable("business");
            table.decimal("lat", 8, 6).notNullable();
            table.decimal("lng", 9, 6).notNullable();
            table.string("zip_code", 20).notNullable();
            table.string("order_id").notNullable();
            table.string("order_address").notNullable();
            table.string("order_email").notNullable();
            table.string("order_phone_number").notNullable();
            table.integer("status", 1).defaultTo(0);
            table.integer("taken", 1).defaultTo(0);
            table.timestamps(true, true);
            return console.log("table destination successfully created");
          });
        } else {
          return console.log("table destination already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
  createTableHistory: function () {
    return db.schema
      .hasTable("history")
      .then((exists) => {
        if (!exists) {
          return db.schema.createTable("history", (table) => {
            table.increments("id").primary();
            table
              .integer("employee_id")
              .unsigned()
              .references("id")
              .inTable("employee");
            table
              .integer("route_id")
              .unsigned()
              .references("id")
              .inTable("route");
            table.timestamps(true, true);
            return console.log("table history successfully created");
          });
        } else {
          return console.log("table history already exists!");
        }
      })
      .catch((err) => console.log(err));
  },
};
