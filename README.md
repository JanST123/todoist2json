# Convert Todoist Backups to JSON files

This DENO script converts CSV Backup files from [Todoist](https://todoist.com/) App to a JSON format.
The JSON files can later be imported to **Apple Reminder** app using Apple Shortcuts app.

You can get the Apple shortcut from here: https://www.icloud.com/shortcuts/f93bcd159e1a44fb8a93cf727c43edde

Read more on it here: https://janpedia.de

## Requirements
* Deno [install Deno](https://deno.com/)
* Todoist CSV Backups (only available with Pro or Teams subscription)
* *Apple Shortcuts* and *Apple Reminders* app to import

## Usage
```
deno run --allow-read --allow-write convert.ts [SRC_DIR] [TARGET_DIR]
```

The `SRC_DIR` must contain at least one .csv file from the Todoist Backup archive (**not the ZIP file**)
The `TARGET_DIR` must exist and will be filled with the converted data in .json files

## Import to Apple reminders
Each list needs to be imported separately via the **Apple Shortcuts app**.

To import one list from the JSON data to Apple Reminders the following steps must be performed:
1. Open one .json file in an appropiate JSON editor **and copy it's content to the clipboard** OR run `cat [PATH_TO_FILE].json | pbcopy` on the mac which will copy the files content to clipboard
1. Open the Apple shortcut you got from the link above and run it
1. Enter a name for a new Reminders list. This list will be filled with the items. If you want to add items to existing list, just enter a temporary name and move the items to the existing list in the Reminders app and delete the temporary list
1. Eventually manually adjust the `export_` tagged items (see [Known issues](#known-issues))

## Features
Will export from Todoist / import to Reminders
* Title
* Description
* Due date
* Priority
* Subtasks (only one level)

## Known issues
Some data cannot be exported / imported because features are not supported or data is not included in export. This is the following:
* Comments / Conversation from Todoist (Feature not supported in Reminders)
* Attachments from todoist (Not included in Todoist backup)
* Recurring events (Not supported when creating Reminders via Shortcut)
* Deeply nested tasks (Reminders only support one level of indention, deeper nested subtask will be imported on the first indention level)
* Duration (not supported by Reminders)
* Sections (Not supported while creating Reminders via Shortcut)
* Responsible person (Not supported by reminders)

Items which were in a todoist section or have a recurring date or were nested deeper than one level will be **tagged** by an `export_` tag when they are imported into Reminders. The notes of the reminder item contain the details (e.g. the recurring date string). You will have to adjust these items by hand and then remove the tag. 


## Format
this is the format of the resulting JSON:
```ts
{
  title: string;
  description?: string;
  date?: string;
  prio1?: boolean;
  prio2?: boolean;
  prio3?: boolean;
  parent?: string;
  tags?: string[]
}[]
```
