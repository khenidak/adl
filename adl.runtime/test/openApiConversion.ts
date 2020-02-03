/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as OpenAPI from '@azure-tools/openapi';

import { suite, test } from 'mocha-typescript';
import { loadADL } from '../serialization/adl';
import { loadOpenApi } from '../serialization/openapi';
import { readFile, writeFile, readdir, mkdir, exists, rmdir } from '@azure-tools/async-io';

require('source-map-support').install();

@suite class OpenAPIConversion {
  /* @test */ async 'converts a folder of specs to usable TypeScript'() {
    const specsDir = `${__dirname}/../../test/scenarios/`;

    // Traverse the example specs path to test each
    const folders = await readdir(specsDir);
    for (const folder of folders) {
      if ([
        'body-formdata',
        'body-formdata-urlencoded',
      ].indexOf(folder) > -1) {
        // console.log(`Skipping: ${folder}`);
        continue;
      }

      // Load the OpenAPI spec and conver it to ADL
      const openApiSpec = <OpenAPI.Model>JSON.parse(await readFile(`${specsDir}/${folder}/openapi-document.json`));
      const adlApi = loadOpenApi(openApiSpec);

      // Create the output directory if it doesn't exist yet
      const outputDir = `${specsDir}/${folder}/output/`;

      await rmdir(outputDir);

      if (!await exists(outputDir)) {
        await mkdir(outputDir);
      }

      // Save the converted spec to disk
      adlApi.save(outputDir);

      // Attempt to open the saved spec
      loadADL(outputDir);
    }
  }
}
