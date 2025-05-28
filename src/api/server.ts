import app from "./app";
import config from "../config";

const port: number = config.port;

const server = app.listen(port, () => {
  console.log(`Work Order API listening on http://localhost:${port}`);
});

export default server;
