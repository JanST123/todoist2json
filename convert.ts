/**
 * this script reads exported TodoIst backups in CSV format (backups are only available on TodoIst Premium!)
 * and outputs them in a custom JSON format, which can then be used with "Apple Shortcuts" App to import the Tasks into "Apple Reminders" App
 */

import * as fs from 'node:fs';
import * as csv from '@fast-csv/parse';
import { TodoistRow } from './models/todoist_row.model.ts';
import { ExportJson } from './models/export_json.model.ts';

if (Deno.args.length < 2) print_usage();

const srcDir = Deno.args[0];
const targetDir = Deno.args[1];

if (!fs.existsSync(srcDir)) print_usage('SRC_DIR does not exist');
if (!fs.existsSync(targetDir)) print_usage('TARGET_DIR does not exist');

const files = fs.readdirSync(srcDir).filter(file => file.match(/\.csv$/));

if (files.length < 1) print_usage('No CSV files found');

/**
 * we have CSV files - start the conversion!
 */

files.forEach(file => {
  const rows: TodoistRow[] = [];

  csv.parseFile(srcDir + '/' + file, {
    headers: true,
    ignoreEmpty: true
  })
    .on('error', error => console.error(error))
    .on('data', (row: any) => rows.push({
      ...row,
      INDENT: parseInt(row.INDENT),
      PRIORITY: parseInt(row.PRIORITY),
    }))
    .on('end', () => {
      const jsonObj = convert(rows);
      const targetFile = targetDir + '/' + file.replace(/\.csv$/, '.json');
      fs.writeFileSync(targetFile, JSON.stringify(jsonObj));

      console.log('Written target', targetFile);
    })


})



/**
 * converts from todoist rows to json object
 */
function convert(srcRows: TodoistRow[]) {
  let currentSection: string | null = null;
  let lastParentTitle = '';
  const targetObject: ExportJson[] = [];
  
  srcRows.forEach(row => {
    if (row.TYPE === 'section') {
      currentSection = row.CONTENT;
      return;
    }

    if (row.TYPE === 'task') {
      const newObj: ExportJson = {
        title: row.CONTENT,
        description: row.DESCRIPTION,
      }

      if (row.PRIORITY === 1) newObj.prio1 = true;
      if (row.PRIORITY === 2) newObj.prio2 = true;
      if (row.PRIORITY === 3) newObj.prio3 = true;

      if (currentSection !== null && row.INDENT === 1) {
        if (!newObj.tags) newObj.tags = [];
        newObj.tags.push('export_SECTION');
        newObj.description = "NEED MANUAL ADJUSTMENT: SECTION: " + currentSection + "\n" + newObj.description;
      }

      if (row.DATE !== '') {
        if (isRecurringDate(row.DATE, row.DATE_LANG as any)) {
          if (!newObj.tags) newObj.tags = [];
          newObj.tags.push('export_RECURRING_DATE');
          newObj.description = "NEED MANUAL ADJUSTMENT: RECURRING_DATE: " + row.DATE + "\n" + newObj.description;

        } else {
          newObj.date = parseDate(row.DATE, row.DATE_LANG as any).toISOString();
        }
      }

      /*
       if INDENT = 1 it has no parent and we set that title to the `lastParentTitle`
       if INDENT = 2 we set `parent` to `lastParentTitle`
       if INDENT > 2 we do the same as for 2 but also add a tag for manual adjustment cause Apple reminders only support one level indention
       */
      if (row.INDENT === 1) {
        lastParentTitle = row.CONTENT;
      } 
      if (row.INDENT >= 2) {
        newObj.parent = lastParentTitle;
      }
      if (row.INDENT > 2) {
        if (!newObj.tags) newObj.tags = [];
        newObj.tags.push('export_INDENTATION');
        newObj.description = "NEED MANUAL ADJUSTMENT: INDENTATION: " + row.INDENT + "\n" + newObj.description;
      }
      

      targetObject.push(newObj);

    }
    

  });

  return targetObject;
}

/**
 * just check if we can parse the date otherwise asume its a recurring date string which we just tag and that needs manual adjustment later
 */
function isRecurringDate(dateStr: string, dateLang: 'de' | 'en') {
  let parsed = false;
  try {
    parseDate(dateStr, dateLang);
    parsed = true;
  } catch(e) {
    // console.log(e);
  }

  return !parsed;
}

/**
 * parse the date out of the date string
 */
function parseDate(dateStr: string, dateLang: 'de' | 'en'): Date {
  const months = {
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  };

  if (!(dateLang in months)) {
    throw 'Date language "' + dateLang + '" not supported!';
  }
  
  let day = 0;
  let month = -1;
  let year = 0;

  // as the format differs, check each part of the date string and detect what it is...
  dateStr.split(' ').forEach(datePart => {
    let monthIndex = months[dateLang].indexOf(datePart.replace(/\.$/, ''));
    if (monthIndex === -1) {
      // also try the short-4 ones
      monthIndex = months[dateLang].map(m => m.substring(0, 4)).indexOf(datePart.replace(/\.$/, ''));
    }
    if (monthIndex === -1) {
      // also try the short-3 ones
      monthIndex = months[dateLang].map(m => m.substring(0, 3)).indexOf(datePart.replace(/\.$/, ''));
    }

    if (monthIndex >= 0) {
      month = monthIndex; // january is 0 here, february 1 etc. which is okay for here as the Date object we create later, accepts them in the same way
      return;
    }

    if (datePart.match(/^[0-9]{4}$/)) {
      year = parseInt(datePart);
      return;
    }

    if (datePart.match(/^[0-9]{1,2}$/)) {
      day = parseInt(datePart);
      return;
    }

    throw 'Invalid date part: ' + datePart;
  });

  // console.log({ dateStr, day, month, year});

  if (day && month >= 0 /* if no year it is the current one */) {
    const d = new Date();
    d.setMonth(month);
    d.setDate(day);
    if (year) d.setFullYear(year);

    return d;
  }

  throw 'Could not parse date string: ' + dateStr + ' day: ' + day + ' month: ' + month + ' year: ' + year;
}



function print_usage(prefix = '') {
  console.error(prefix + ' Usage: node convert.js SOURCE_DIR (the directory with your todoist exports) TARGET_DIR (directoy where the json files should be placed)');
  Deno.exit(-1);
}