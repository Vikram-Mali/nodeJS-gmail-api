import express from "express";
import * as controls from "../dist/controls.js";
const router = express.Router();
router.get('/mail/start/', controls.main);
export { router };
//# sourceMappingURL=routes.js.map