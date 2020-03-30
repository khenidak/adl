/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test, describe, it } from 'mocha-typescript';
import * as assert from 'assert';
import { readFile, writeFile, readdir, mkdir } from '@azure-tools/async-io';

@suite class SampleTest {
  /* @test */ async 'test something'() {
    assert.equal(1, 1, 'works for me kids!');
    /*
    const folders = await readdir(`${__dirname}/../../test/scenarios/`);
    for (const each of folders) {
      if ([
        'body-formdata',
        'body-formdata-urlencoded',
      ].indexOf(each) > -1) {
        console.log(`Skipping: ${each}`);
        continue;
      }

      console.log(`Processing: ${each}`);

    }
    */
  }
}
