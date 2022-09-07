/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as fs from "fs";
import {relative} from "path";
import * as process from "process";
import * as checkstyle from "./checkstyle";

async function main(): Promise<void> {
    core.startGroup("⚙ Setting up");
    const reports = core.getInput("reports", {required: true});
    core.endGroup();

    core.startGroup("📚 Reading reports");
    const globber = await glob.create(reports);
    const files = await globber.glob();
    const checkstyleFiles: checkstyle.File[] = [];

    for (const filePath of files) {
        try {
            const text = fs.readFileSync(filePath, {encoding: 'utf-8'})
            checkstyleFiles.push(...checkstyle.readFiles(text));
        } catch (e) {
            core.error(e);
        }
    }
    core.endGroup();

    core.startGroup("✏ Annotating files");
    for (const file of checkstyleFiles) {
        const fileName = relativise(file.name);

        for (const error of file.errors) {
            const annotation: core.AnnotationProperties = {
                file: fileName,
                startLine: error.line,
            }

            if (error.column != null) {
                annotation.startColumn = error.column;
            }

            switch (error.severity) {
                case checkstyle.SeverityLevel.Error:
                    core.error(error.message, annotation);
                    break;
                case checkstyle.SeverityLevel.Warning:
                    core.warning(error.message, annotation);
                    break;
                case checkstyle.SeverityLevel.Info:
                    core.notice(error.message, annotation);
                    break;
            }
        }
    }
    core.endGroup();
}

function relativise(path: string): string {
    return relative(process.cwd(), path);
}

main().catch((e: Error) => {
    core.setFailed(e);
});
