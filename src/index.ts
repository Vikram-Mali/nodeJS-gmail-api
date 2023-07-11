import express from "express";
import dotenv from "dotenv";
import * as controls from "../dist/controls.js";

dotenv.config();

const app = express();

controls.start()
