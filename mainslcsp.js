/** SOME SAMPLE CODE FOR CODE ADDED PARAMETERS. **/
/** (Might be useful.)                          **/
/*
	let csvFile1 = "./testmain/zipscopy.csv";
	let dbTable1 = "zipscopytable";
	let dbFile1 = "./testmain/zipscopy.db";
	let cwd1 = __dirname + "/";
 */


const sqlite3 = require('better-sqlite3');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const helper = require('./helper-slcsp.js');
let sq = require("./sqlite3-slcsp.js");
let debug = require('debug')('helper:debug');
let prod = require('debug')('helper:prod');

debug("mainslcp.js:start");

const optionDefinitions = helper.optionDefinitions();

let options = undefined;
try {
	debug('before commandLine');
	// commandLineArgs will generate exception if invalid flag is present.
	// This is good!
	options = commandLineArgs(optionDefinitions);
	debug('after commandLine');
	// let attachSql1 = "ATTACH THIS it will be moved";
    let makeConvertCSV0 = helper.makeConvertCSV(options.csvFile0, options.dbFile0, options.dbTable0, options.cwd0);
    let makeConvertCSV1 = helper.makeConvertCSV(options.csvFile1, options.dbFile1, options.dbTable1, options.cwd1);

	helper.parseCommandLine(options).
		then(helper.passthrough).
		then(helper.makePassthrough("after parseCommandLine")).
		then(helper.checkCommandLine).
		then(helper.checkSqlite3Exists, helper.makeReject("checkSqlite3Exists")).
		then(makeConvertCSV0).
		then(makeConvertCSV1).
		then(helper.makeConvertCSV(options.csvfile2, options.dbfile2, options.dbtable2, options.cwd2)).
		then(helper.openEmptySqlite3,(res)=>{console.log(res);}).
		then(helper.makeCallSql(helper.attachSql0(options))).
		then(helper.makeCallSql(helper.attachSql1(options))).
		then(helper.makeCallSql(helper.attachSql2(options))).
		/* first dbtableN is actually the schema */
		then(helper.makeCopyTable(options.dbtable0+"."+options.dbtable0, options.dbtable0)).
		then(helper.makeCopyTable(options.dbtable1+"."+options.dbtable1, options.dbtable1)).
		then(helper.makeCopyTable(options.dbtable2+"."+options.dbtable2, options.dbtable2)).
		then(helper.makeSaveDbFile(options.output)).
		then(helper.closeSqlite3).
		then(helper.makeOpenSqlite3(options.output)).
		then(helper.addSecondAggregate).
		then(helper.makeCallSql(sq.adHocSlcspSQL())). /* @todo rename makeAttachDB as makeRunSQL */
		then(helper.makeCallSql(sq.adHokSlcspSecondSql())).
		then(helper.makeProduceExpectedOutput(options.cwd0 + options.csvfile0)).
		then(helper.closeSqlite3).
		then(helper.makeCleanUp(options)).
		then(helper.exitSuccess).
		catch(helper.helpercatch);
}
catch (err) {
	// Handle exception gracefully by reporting to user and presenting
	// command line usage.
	let sections = helper.commandLineUsageSections();
	debug('sections='+JSON.stringify(sections));
	let content = "exception caught: "+err;
	let newSection = {
			header: 'Important Info',
			content: content
	};
	let updatedSections = helper.addSection(sections, newSection);
	debug('updatedSections='+JSON.stringify(updatedSections));
	const usage = commandLineUsage(sections);
	console.log(usage);
	process.exit(1);
}

// This area should not be reached.
