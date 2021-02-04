
/*
 * Script outline.
 * a) Do the require.
 * b) define the async main function.  The primary
 * code is in it, and makes calls to helper-* modules.
 * c)
 */
const sqlite3 = require('better-sqlite3');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const helper = require('./helper-slcsp.js');
let sq = require("./sqlite3-slcsp.js");
let debug = require('debug')('helper:debug');
let prod = require('debug')('helper:prod');

debug("mainslcp.js:start");

/*
 * The primary function (async) of this program.
 * The program path is strictly linear, and should be
 * easy to follow.  Each step is await-ed upon,
 * and if a Promise does not resolve, the remaining
 * steps are skipped, and the catch is called.
 */
async function mainslcsp () {
	// use "esversion:6"
	let rSql3;
	const optionDefinitions = helper.optionDefinitions();
	debug('before commandLine');
	// commandLineArgs will generate exception if invalid flag is present.
	// This is good!
	let options = commandLineArgs(optionDefinitions);
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
		let msg = "checkSqlite3Exists: problem;" + err;
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
	let attach1 = helper.makeCallSql(helper.attachSql1(options));
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
	let slcspsql = helper.makeCallSql(sq.adHocSlcspSQL()); /* @todo rename makeAttachDB as makeRunSQL */
    let rSlcspsql = await slcspsql(rDbOut);
    let slcsp2 = helper.makeCallSql(sq.adHokSlcspSecondSql());
    let rSlcsp2 =   await slcsp2(rDbOut);
	let produce = helper.makeProduceExpectedOutput(options.cwd0 + options.csvfile0);
    let rProduce =  await produce(rDbOut);
	let rClose2 =   await helper.closeSqlite3(rDbOut);
	let clean = helper.makeCleanUp(options);
	let rClean =    await clean(rClose2);
	let success =   await helper.exitSuccess(rClean);
}

mainslcsp().catch(helper.helpercatch);

// This area should not be reached.
