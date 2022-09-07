/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { XmlDocument } from "xmldoc";

export enum SeverityLevel {
    Ignore = "ignore",
    Info = "info",
    Warning = "warning",
    Error = "error"
}

export type File = {
    name: string,
    errors: Error[]
}

export type Error = {
    line: number,
    column: number | null,
    severity: SeverityLevel,
    message: string
}

export function readFiles(xml: string): File[] {
    const files: File[] = [];
    const doc = new XmlDocument(xml);
    doc.eachChild(child => {
        if (child.name != "file") return;

        const fileName = child.attr["name"];
        const errors: Error[] = child.childrenNamed("error").map(errorXml => {
            const line = Number.parseInt(errorXml.attr["line"]);
            const severity = errorXml.attr["severity"] as SeverityLevel;
            const message = errorXml.attr["message"];
            const columnAttr = errorXml.attr["column"];
            const column = columnAttr != null ? Number.parseInt(columnAttr) : null;
            return { line, column, severity, message };
        });

        if (errors.length > 0) {
            console.log("Errors in " + fileName, errors);
            files.push({
                name: fileName,
                errors
            });
        }
    })
    return files;
}
