#!/usr/bin/env node --experimental-specifier-resolution=node --unhandled-rejections=strict

import { start } from "../index";

start()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
