const {Pool} = require("pg")

const pool = new Pool ({
    user: "postgres",
    host: "localhost",
    database: "mytube_db",
    password: "mytube",
    port: 5432
})

module.exports = pool