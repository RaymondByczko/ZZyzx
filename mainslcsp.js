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
	helper.parseCommandLine(options).
		then(helper.checkCommandLine).
		then(helper.checkSqlite3Exists, helper.makeReject("checkSqlite3Exists")).
		then(helper.makeConvertCSV(options.csvfile0, options.dbfile0, options.dbtable0, options.cwd0)).
		then(helper.makeConvertCSV(options.csvfile1, options.dbfile1, options.dbtable1, options.cwd1)).
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

async function mainslcsp () {
	let rSql3;
	debug('before commandLine');
	// commandLineArgs will generate exception if invalid flag is present.
	// This is good!
	options = commandLineArgs(optionDefinitions);
	debug('after commandLine');
	// let attachSql1 = "ATTACH THIS it will be moved";
	let rParse = 	await helper.parseCommandLine(options);
	let rCheck = 	await helper.checkCommandLine(rParse);
	try {
	rSql3 =			await helper.checkSqlite3Exists(rCheck);
	debug('rSql3='+rSql3);
	}
	catch (err) {
		debug('err='+err);
		let msg = "checkSqlite3Exists: problem;" += err;
		throw new Error(msg);
	}
	let convert0 = helper.makeConvertCSV(options.csvfile0, options.dbfile0, options.dbtable0, options.cwd0);
	let rConvert0 =	await convert0(rSql3);
	let convert1 = helper.makeConvertCSV(options.csvfile1, options.dbfile1, options.dbtable1, options.cwd1);
	let rConvert1 = await convert1(rConvert0);
	let convert2 = helper.makeConvertCSV(options.csvfile2, options.dbfile2, options.dbtable2, options.cwd2);
	let rConvert2 = await convert2(rConvert1);
	let rDb =		await helper.openEmptySqlite3();
	let attach0 = helper.makeCallSql(helper.attachSql0(options));
	let rAttach0 =	await attach0(rDb);
	let attache1 = helper.makeCallSql(helper.attachSql1(options));
	let rAttach1 =	await attach1(rDb);
	let attach2 = helper.makeCallSql(helper.attachSql2(options));
	let rAttach2 =	await attach2(rDb);
		/* first dbtableN is actually the schema */
	let copy0 = helper.makeCopyTable(options.dbtable0+"."+options.dbtable0, options.dbtable0);
	let rCopy0 =	await copy0(rDb);
	let copy1 = helper.makeCopyTable(options.dbtable1+"."+options.dbtable1, options.dbtable1);
	let rCopy1 =	await copy1(rDb);
	let copy2 = helper.makeCopyTable(options.dbtable2+"."+options.dbtable2, options.dbtable2);
	let rCopy2 = 	await copy2(rDb);
	let save = helper.makeSaveDbFile(options.output);
	let rSave =		await save(rDb);
	let rClose =	await helper.closeSqlite3(rDb);
	let opensqlite3 = helper.makeOpenSqlite3(options.output);
	let rDbOut = await opensqlite3(rClose);
	let aggregate = await helper.addSecondAggregate(rDbOut);
	then(helper.makeCallSql(sq.adHocSlcspSQL())). /* @todo rename makeAttachDB as makeRunSQL */
		then(helper.makeCallSql(sq.adHokSlcspSecondSql())).
	then(helper.makeProduceExpectedOutput(options.cwd0 + options.csvfile0)).
	then(helper.closeSqlite3).
	then(helper.makeCleanUp(options)).
	then(helper.exitSuccess).
	catch(helper.helpercatch);
}
// This area should not be reached.
