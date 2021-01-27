let sq = require("./sqlite3-slcsp.js");
let clu = require("./helper-command-line-usage");

const fs = require('fs');
const fsPromises = fs.promises;
let child_process = require('child_process');
// const sqlite3 = require('sqlite3').verbose();
const sqlite3 = require('better-sqlite3');
const parse = require('csv-parse/lib/sync');
let commandLineUsage = require('command-line-usage');
let debug = require('debug')('helper:debug');
let prod = require('debug')('helper:prod');

/*
 * Client code of this module can call this to make
 * sure the module is read and processed correctly.
 */
function helper() {
    debug("helper (repl.it)in helper-slcsp.js");
}






/*
 * Produces the sections for command line usage.
 * This contains the help guide to display
 */
function commandLineUsageSections() {
    let sections = [
        {
            header: 'SLCSP Command Line Tool',
            content: clu.header_content()
        },
        {
            header: 'Options',
            optionList: [
                {
                    name:"help",
                    description: "Print this usage guide."
                },
                {
                    name: "csvfile0",
                    description: clu.csvf0_description()
                },
                {
                    name: "dbfile0",
                    description: clu.dbfile0_description()
                },
                {
                    name: "dbtable0",
                    description: clu.dbtable0_description()
                },
                {
                    name: "cwd0",
                    description: clu.cwd0_description()
                },
                {
                    name: "csvfile1",
                    description: clu.csvfile1_description()
                },
                {
                    name: "dbfile1",
                    description: clu.dbfile1_description()
                },
                {
                    name: "dbtable1",
                    description: clu.dbtable1_description()
                },
                {
                    name: "cwd1",
                    description: "The working directory for csvfile1 and dbfile1."
                },
                {
                    name: "csvfile2",
                    description: "The third csvfile representing all known plan data, which has planid, state, and rate_area."
                },
                {
                    name: "dbfile2",
                    description: "The database file corresponding to csvfile2."
                },
                {
                    name: "dbtable2",
                    description: "The table name into which csv data from csvfile2 is imported into dbfile2."
                },
                {
                    name: "cwd2",
                    description: "The working directory for csvfile2 and dbfile2."
                },
                {
                    name: "output"
                }
            ]
        }
    ];
    return sections;

}


// Given the current sections that would presumably be used by commandLineUsage,
// this function adds a new section to the beginning of it, and returns
// the updatedSections.  The updated sections can then be given to commandLineUsage.
function addSection(sections, newSection) {
    let updatedSections = sections.unshift(newSection);
    return updatedSections;
}

/*
 * A front-end to convertCSV.  makeConvertCSV is called
 * with arguments to enable a *.csv file to be converted to
 * a sqlite3 *.db file.  It produces an anonymous async
 * function with closure over the parameters given to
 * makeConvertCSV.
 *
 * convertCSV needs to participate in a promise chain.
 * However, convertCSV needs 4 parameters, and promise
 * chain functions need one.  Further, the requirement
 * to know these 4 can be pushed into several areas,
 * which has its consequences.
 *
 * They can be put into one object, and delivered by
 * an earlier entity in the promise chain.  However, this
 * couples one entity of the chain with the next.
 * This can be a burden to keep in sync.
 *
 * Another place to put it in the caller of the ENTIRE
 * promise chain.  This is the approach used.
 * The client of the ENTIRE chain calls makeConvertCSV.
 */
function makeConvertCSV(csvFile,dbFile,dbTable,cwd) {
    debug("makeConvertCSV:start");
    debug("makeConvertCSV:csvFile="+csvFile);
    debug("makeConvertCSV:dbFile="+dbFile);
    debug("makeConvertCSV:dbTable="+dbTable);
    debug("makeConvertCSV:cwd="+cwd);
    let argUndefined = (typeof csvFile === 'undefined');
    argUndefined = argUndefined||(typeof dbFile === 'undefined');
    argUndefined = argUndefined||(typeof dbTable === 'undefined');
    argUndefined = argUndefined||(typeof cwd === 'undefined');
    if (argUndefined) {
        throw new Error("makeConvertCSV:argUndefined");
    }
    return async function(priorResult){
        debug("anonymous function:start");
        let retConvert = await convertCSV(csvFile, dbFile, dbTable, cwd);
        return Promise.resolve(retConvert);
    }
}

/*
 * This is async called to produce the *.db file from a *.csv file.
 * It is intended to be called within makeConvertCSV, which
 * sets up a closure.
 */
async function convertCSV(csvFile, dbFile, dbTable, cwd) {
    debug("convertCSV:start");
    let obj1 = new sq.Sqlite3slcsp(csvFile, dbFile, dbTable, cwd);
    obj1.produceDBfile();
    // This returns some status, in the event the next stage in the chain
    // needs it.
    let retObj = {
        functionCalledDetails: {
            functionName: "convertCSV",
            exitStatus: 0,
            csvFile: csvFile,
            dbFile: dbFile,
            dbTable: dbTable,
            cwd: cwd
        },
    };
    return retObj; // returns a Promise, since all async functions return these.
}

// used to run general commands, like 'which sqlite3'.
// This method must be used carefully if it allows
// any user input from over the web.
async function runCommand(cmd, execOptions) {
    return new Promise((resolve, reject) => {
        child_process.exec(cmd, execOptions, (err, stdout, stderr) => {
            if (err) {
                debug("runCommand:err="+err);
                reject(err);
            } else {
                debug("runCommand:stdout="+stdout);
                resolve(stdout);
            }
        });
    });
}

/*
 * Determines if no regular operation options are present
 * among actual options. If absolutely none of the
 * regular options are present, then true is returned.  Otherwise,
 * false is returned.
 */
function noRegularOperationOptions(options, regularOptions) {
    debug('noRegularOperationOptions:start');
    let retValue = true;
    for (let i=0; i < regularOptions.length; i++) {
        let element =regularOptions[i];
        let hasIt = options.hasOwnProperty(element);
        if (hasIt){
            retValue = false;
            break;
        }
    };
    debug('noRegularOperationOptions:'+JSON.stringify(retValue));
    debug('noRegularOperationOptions:end');
    return retValue;
}

/*
 * Determine if given options received during program invocation,
 * this would indicate regular mode operation.  The requirement
 * is that all regular options have to be specified.  If at least
 * one regular mode option is missing, then this is not considered
 * regular mode.
 */
function isModeRegularOperation(options, regularOptions) {
    let allPresent = true;

    let firstMissing;
    for (let i = 0; i < regularOptions.length; i++) {
        //  expectedOptions.forEach((element) => {
        let element = regularOptions[i];
        let hasIt = options.hasOwnProperty(element);
        allPresent = allPresent && hasIt;
        if (!hasIt) {
            firstMissing = element;
            break;
        }
    }
    let retStatus = {
        modeRegularOperation: allPresent,
        firstMissing: firstMissing
    }
    return retStatus;
}

/*
 * Given the options that are actually given to the program
 * when invoked, this async function determines if the
 * expected ones are given.
 */
async function parseCommandLine(options) {
    debug("parseCommandLine:start");
    debug("...options="+JSON.stringify(options));
    let helpOptions = [
        "help"
    ];
    // @todo possibly rename expectedOptions as regularOptions.
    // At this point of time, options are either a) no options specified b) help
    // c) regular operation.
    let expectedOptions = [
        "csvfile0",
        "dbfile0",
        "dbtable0",
        "cwd0",
        "csvfile1",
        "dbfile1",
        "dbtable1",
        "cwd1",
        "csvfile2",
        "dbfile2",
        "dbtable2",
        "cwd2",
        "output",
        "keepdbfiles"
    ];

    // NOFLAG MODE (results in HELP MODE)
    if ((!(options.hasOwnProperty('help'))) && noRegularOperationOptions(options, expectedOptions))
    {
        try {
            debug('parseCommandLine:NOFLAG MODE');
            let sections = commandLineUsageSections();
            debug('sections='+JSON.stringify(sections));
            const usage = commandLineUsage(sections);
            console.log(usage);
            process.exit(0);
        }
        catch (e) {
            console.log('NOFLAG MODE:exception');
        }
    }
    // HELP MODE
    // Lets see if just help is desired.
    if ((options.hasOwnProperty('help')) && noRegularOperationOptions(options, expectedOptions))
    {
        debug('parseCommandLine:HELP MODE');
        let sections = commandLineUsageSections();
        const usage = commandLineUsage(sections);
        console.log(usage);
        process.exit(0);
    }

    // REGULAR OPERATION MODE
    // Lets see if its not help but regular operation.
    // (help is not present under regular operation)
    let regularModeStatus = isModeRegularOperation(options, expectedOptions);
    debug('regularModeStatus='+JSON.stringify(regularModeStatus));
    /***
    let allPresent = true;

    let firstMissing = undefined;
    for (let i=0; i< expectedOptions.length; i++) {
        //  expectedOptions.forEach((element) => {
        let element = expectedOptions[i];
        let hasIt = options.hasOwnProperty(element);
        allPresent = allPresent && hasIt;
        if (!hasIt){
            firstMissing = element;
            break;
        }
    };
    ***/
    // end

    if (regularModeStatus.modeRegularOperation == false) {
        debug('parseCommandLine:REGULAR MODE not fully specified');
        let sections = commandLineUsageSections();
        const usage = commandLineUsage(sections);
        console.log(usage);
        process.exit(0); // @todo possibly change exit value
    }
    let retObj = {
        allPresent: regularModeStatus.modeRegularOperation,
        firstMissing: regularModeStatus.firstMissing,
        options: options
    };
    debug("parseCommandLine:end");
    return Promise.resolve(retObj);

}

/*
 *Are the files specified on the command line
 * actually in the file system?
 * @todo check for existence of csvfile0 and its
 * related files.
 */
async function checkCommandLine(resultPrevious) {
    debug("checkCommandLine");
    debug("... resultPrevious="+JSON.stringify(resultPrevious));
    if (!resultPrevious.allPresent) {
        // @todo resolve this.
    }
    if (resultPrevious.allPresent) {
        let csvfile1 = resultPrevious.options.csvfile1;
        let dbfile1 = resultPrevious.options.dbfile1;
        let cwd1 = resultPrevious.options.cwd1;
        let path1 = cwd1 + csvfile1;
        try {
            await fsPromises.access(path1, fs.constants.R_OK);
        } catch (err) {
            debug("err=" + err);
            throw err;
        }
        let csvfile2 = resultPrevious.options.csvfile2;
        let dbfile2 = resultPrevious.options.dbfile2;
        let cwd2 = resultPrevious.options.cwd2;
        let path2 = cwd2 + csvfile2;
        try {
            await fsPromises.access(path2, fs.constants.R_OK);
        } catch (err) {
            debug("err=" + err);
            throw err;
        }
        try {
            let path1Stat = await fsPromises.stat(path1);
            debug("path1Stat.size="+path1Stat.size);
            if (path1Stat.size == 0) {
                throw Error("csvfile1 is zero size");
            }
        } catch (err) {
            debug("err="+err);
            throw err;
        }
        // runCommand()
    } else {
        throw new Error("resultPresent is false");
    }
    return Promise.resolve("CHECKCOMMANDLINE_OK");
}

/*
 * Check to see if sqlite3 is installed.  This is
 * a requirement to run mainslcsp.js fully.
 * The dot command ".import" will be needed.
 */
async function checkSqlite3Exists(priorResult) {
    debug('checkSqlite3Exists:start');
    debug('... priorResult='+ priorResult);
    let cmd = 'which sqlite3'

    try {
        let s3 = await runCommand(cmd);
        debug("...s3=" + s3);
        if (s3 != "") {
            return "sqlite3 is installed";
        }
    }
    catch (e) {

        let msg = "checkSqlite3Exists:need to install sqlite3:e=" + e;
        debug(msg);
        return Promise.reject(msg);
    }
}

/*
 * All of the command-line options for mainslcsp.js are given
 * here.
 */
function optionDefinitions(){
    const od = [
        {
            name: 'help',
            type: Boolean,
            alias: 'h'
        },
        {
            name: 'csvfile0',
            type: String
            /* The 0th file that will be converted.
             *
             *
             * The file slcsp.csv given in the slcsp.zip archive.
             * It will be converted to the sqlite3 file given by dbfile0
             */
        },
        {
            name: 'dbfile0',
            type: String
            /* The database file which was converted from csvfile0. */
            /* This is a sqlite3 db file currently. */
        },
        {
            name: 'dbtable0',
            type: String
            /* When a csv file is converted into a database file, the
             * data in the csv file needs to live in a certain table.
             * That table is given by dbtable0, for the database file
             * dbfile0, which was converted from csvfile0.
             */
        },
        {
            name: 'cwd0',
            type: String
            /*
             * The files csvfile0 and dbfile0 need to live in some
             * directory.  That location is given by cwd0.
             */
        },
        {
            name: 'csvfile1',
            type: String
            /* The second csvfile (0 based) that will be converted to a db file, given by dbfile1.
             * In general, this is anticipated to be zips.csv
             * The relationship between csvfile1, dbfile1, dbtable1, cwd1
             * is much the same as elaborated upon for csvfile0.
             */
        },
        {
            name: 'dbfile1',
            type: String,
            defaultOption: true
            /* The result of converting csvfile1 to a db file. */
        },
        {
            name: 'dbtable1',
            type: String
            /* The name of the table into which the data from csvfile1 is stored.*/
            /* The table is not implied nor found in the csvfile. */
            /* dbtable1 does double duty as a specifier for the schema when attach database is done. */
            /* The immediate above is a possible @todo - have schema1 as an option.*/
        },
        {
            name:'cwd1',
            type: String
            /* The location of the files csvfile1 and dbfile1. */
        },
        {
            name:'csvfile2',
            type: String
            /* The third csvfile (0 based) that will be converted to a db file, given by dbfile2.
             * In general, this is anticipated to be plans.csv from the archive
             * slcsp.zip.
             */
        },
        {
            name:'dbfile2',
            type: String
            /* The result of converting csvfile2 to a dbfile. */
        },
        {
            name:'dbtable2',
            type: String
            /* The name of the table into which the data from csvfile2 is stored.*/
            /* The table is not implied nor found in the csvfile. */
            /* dbtable2 does double duty as a specifier for the schema when attach database is done. */
            /* The immediate above is a possible @todo - have schema2 as an option.*/
        },
        {
            name: 'cwd2',
            type: String
            /* The location of the files csvfile2 and dbfile2. */
        },
        {
            name: 'output',
            type: String
            /*
             * The name of the output database file.
             * @todo As it stands on 2020-12-26 11:51EST, the concept
             * of output is underspecified.  Specifically the location
             * of that database file is needed.  Providing a remedy
             * for this will insure all options are seen somewhat alike.
             */
        },
        {
            name: 'keepdbfiles',
            type: Boolean,
            /*
             * Indicates whether or not the sqlite3 database (db) files are kept
             * after execution.  Since the requirements do not specify the production
             * of these artifacts, this is by default set to false.
             */
            // defaultValue: false
        }
    ];
    return od;
}

/*
 * This opens an empty sqlite3 database in memory.  Eventually
 * that database will be populated, by attach for example.  Then
 * it will be backup or saved in some fashion.
 */
async function openEmptySqlite3() {
    debug("openEmptySqlite3:start");
    // let objDB = await new sqlite3.Database(":memory");
    let objDB = await new sqlite3(":memory:");
    return Promise.resolve(objDB);
}

/*
 * @todo the following may be refactored with the above.
 */
async function openSqlite3(pathName) {
    debug("openSqlite3:start");
    let objDB = await new sqlite3(pathName);
    return Promise.resolve(objDB);
}

/*
 * Allows the client code that is invoking the entire
 * promise chain, to call this and store pathName
 * as an effect of a closure.
 */
function makeOpenSqlite3(pathName){
    return async function(prevResult){
        let objDB = await openSqlite3(pathName);
        return Promise.resolve(objDB);
    }
}

/*
 * Simply closes an sqlite3 database.
 */
async function closeSqlite3(objDB) {
    let retClose = await objDB.close();
    return "closeSqlite3: returned="+retClose;
}

/*
 * Attach a database to the current database.
 */
async function callSql(currentDb, sqlSt) {
    debug("callSql:start");
    debug("callSql:sqlSt="+sqlSt);
    debug("callSql:currentDb="+currentDb);
    // let attachSql = "ATTACH DATABASE '" + cwd1 + dbFile1 + "' " + 'AS' + ' ' + dbName1;
    await awaitCallSql(currentDb, sqlSt);
    return Promise.resolve("attacheDB: success");
}

/*
 * Allows the sql statement to be delivered to an async function
 * definition, by means of a closure.  In this way, callSql can participate
 * in a promise chain which likes single parameter async functions.
 */
function makeCallSql(sqlSt){
    // let attachSql = "ATTACH DATABASE '" + cwd1 + dbFile1 + "' " + 'AS' + ' ' + dbName1;
    return async function(currentDB){
        debug("makeCallSql:closure:currentDB="+currentDB);
        await callSql(currentDB, sqlSt);
        return Promise.resolve(currentDB);
    }
}

/*
 * Given options, attachSql0 will produce the correct SQL to attach a database file
 * in sqlite3. This is for the zero-th database file.
 */
function attachSql0(options) {
    debug("attachSql1:options="+JSON.stringify(options));
    // @todo possibly use something other than dbtable1
    let retSql = "attach database '" + options.cwd0 + options.dbfile0 + "' " + 'AS' + ' ' + options.dbtable0;
    return retSql;
}

/*
 * Given options, attachSql1 will produce the correct SQL to attach a database file
 * in sqlite3. This is for the first database file.
 */
function attachSql1(options) {
    debug("attachSql1:options="+JSON.stringify(options));
    // @todo possibly use something other than dbtable1
    let retSql = "attach database '" + options.cwd1 + options.dbfile1 + "' " + 'AS' + ' ' + options.dbtable1;
    return retSql;
}

/*
 * Given options, attachSql2 will produce the correct SQL to attach a database file
 * in sqlite3. This is for the second database file.
 */
function attachSql2(options) {
    debug("attachSql1:options="+JSON.stringify(options));
    // @todo possibly use something other than dbtable2
    let retSql = "ATTACH DATABASE '" + options.cwd2 + options.dbfile2 + "' " + 'AS' + ' ' + options.dbtable2;
    return retSql;
}

async function awaitCallSql(objDB, sqlSt) {
    debug('awaitCallSql:start');
    debug('awaitCallSql:objDB='+objDB);
    debug('awaitCallSql:sqlSt='+sqlSt);
    return retVal = await new Promise((resolve, reject) => {
        let stmt = objDB.prepare(sqlSt);
        stmt.run();
        // objDB.exec(attachSql);
        debug("awaitCallSql:exec-post");
        resolve();
        /**
        objDB.run(attachSql, (err) => {
            // console.log('awaitAttach:err=' + err);
            if (err) {
                reject();
            } else {
                resolve();
            }
            console.log('awaitAttach:err=' + err);

        });
         **/
    });
}

function makeCopyTable(originalTable, newTable) {
    return async function(db) {
        await copyTable(db, originalTable, newTable);
        return db;
    }
}
async function copyTable(db, originalTable, newTable) {
    debug("copyTable:start");
    let sqlCopy = "CREATE TABLE";
    sqlCopy += " ";
    sqlCopy += newTable;
    sqlCopy += " ";
    sqlCopy += "AS";
    sqlCopy += " ";
    sqlCopy += "SELECT *";
    sqlCopy += " ";
    sqlCopy += "FROM";
    sqlCopy += " ";
    sqlCopy += originalTable;
    sqlCopy += " ";
    // sqlCopy += "WHERE 0";
    let stmt = db.prepare(sqlCopy);
    let info = stmt.run();
    debug("info=" + info);
    return Promise.resolve(db);
}

function makeSaveDbFile(pathName) {
    return async function(objDB){
        await saveDbFile(objDB, pathName);
        return Promise.resolve(objDB);
    }
}


async function saveDbFile(objDb, pathName) {
    debug("saveDbFile:start");
    let  dbBackup = await objDb.backup(pathName);
    debug("dbBackup="+ JSON.stringify(dbBackup));
    // await objDb.close();
    return objDb;
}
/*
 * An aggregate (or summary) function to figure out the second highest
 * value in a certain column.  For the moment, this will be utilized
 * on the rate column of the plans table in the slcsp data.
 */
async function addSecondAggregate(objDb){
    debug("addSecondAggregate:start");
    objDb.aggregate('getSecond', {
        start: () => [],
        step: (array, nextValue) => {
            array.push(nextValue);
        },
        result: array => {
            let uniq = [... new Set(array)];
            uniq.sort(function(a,b) {return a-b;});
            if (uniq.length < 2) {
                // There is no second place value
                // @todo return -1 for now
                return -1;
            }
            return uniq[1]; // return 2nd place value - 0 based index.
        },
    });
    debug("addSecondAggregate:end");
    return objDb;
}

function makeProduceExpectedOutput(inputCSVPathName) {
    return async function(objDB) {
        await produceExpectedOutput(inputCSVPathName, objDB);
        return Promise.resolve(objDB);
    }
}

/*
 * Provides the clean up of certain files produced by this program.
 * Most notably, the dbfiles (that is the sqlite3 files) produced.
 * Depending on command line options, these are retained for diagnostic
 * reasons or other purposes.  Or they can be simply removed, since
 * they are not a requirement of the program.
 */
async function cleanUp(options) {
    debug("cleanUp:start");
    let dbfile0 = options.dbfile0;
    let cwd0 = options.cwd0;
    let path0 = cwd0 + dbfile0;

    let dbfile1 = options.dbfile1;
    let cwd1 = options.cwd1;
    let path1 = cwd1 + dbfile1;

    let dbfile2 = options.dbfile2;
    let cwd2 = options.cwd2;
    let path2 = cwd1 + dbfile2;

    try {
        if (!options.keepdbfiles) {
            await fsPromises.access(path0, fs.constants.F_OK);
            await fsPromises.rm(path0, {force: true}); // Do not produce exception
            await fsPromises.access(path1, fs.constants.F_OK);
            await fsPromises.rm(path1, {force: true}); // Do not produce exception
            await fsPromises.access(path2, fs.constants.F_OK);
            await fsPromises.rm(path2, {force: true}); // Do not produce exception
            await fsPromises.access(options.output, fs.constants.F_OK);
            await fsPromises.rm(options.output, {force: true}); // Do not produce exception
        }
    } catch (err) {
        debug("cleanUp:err=" + err);
        throw err;
    }
}

function makeCleanUp(options) {
    return async function(prevResult) {
        await cleanUp(options);
        return Promise.resolve("cleanUp:success");
    }
}

/*
 * Produces the expected output for the Ad Hoc SLCSP
 * homework.
 * @todo the column headers in the csv file are hardcoded
 * in the csv file and are hard coded here.  Think of remedy!
 */
async function produceExpectedOutput(inputCSVPathName, objDB) {
    debug("produceExpectedOuput:start");
    const content = await fsPromises.readFile(inputCSVPathName);

    let sqlSt = "select * from slcspnewsecond";
    const stmt = objDB.prepare(sqlSt);
    /*stmt.all(sqlSt, [], (err,rows) => {
        if (err) {
            throw err;
        }
        rows.forEach((row)=>{
            //   console.log(row.state);
            console.log("produceExpectedOutput:row="+row);
        })
    })*/
    let ziprates = stmt.all();
    debug("ziprates="+JSON.stringify(ziprates));

    console.log("zipcode","rate");
    const records = parse(content, {columns:true /*['zip', 'r']*/});
    records.map(record=>{
        debug("record="+record);
        debug("record[zipcode]="+record['zipcode']);
        debug("record[rate]="+record['rate']);

        // console.log(record['zipcode']);
        let i = ziprates.findIndex((element)=>{
            if (element.zipcode == record['zipcode']){
                return true;
            }
            else {
                return false;
            }
        });
        let noSecond = "-1";
        if ((i != -1) && (ziprates[i]['getSecond(rate)'] != noSecond)) {
            debug("2nd lowest=" + ziprates[i]['getSecond(rate)']);
            // console.log(",");
            console.log(record['zipcode']+","+ziprates[i]['getSecond(rate)']);
        } else {
            debug("2nd lowest=");
            console.log(record['zipcode']+",");
        }
    });
    return objDB;
}

/*
 * Called near the end of successful conclusion of a Promise chain.
 */
async function exitSuccess(prevResult) {
    debug("exitSuccess:start");
    process.exit(0);
}

/*
 * If this is called in the Promise chain, there has been a problem.
 * Display it @todo send to stderr, and then exit with non-zero exit
 * status.
 */
function helpercatch(res) {
    console.log("helpercatch:res="+res);
    process.exit(2);
}

function makeReject(caller) {
    return async function(rejectResult) {
        console.log("makeReject:caller="+caller);
        return Promise.reject("caller="+caller);
    }
}

exports.helper = helper;
exports.commandLineUsageSections = commandLineUsageSections;
exports.addSection = addSection;
exports.makeConvertCSV = makeConvertCSV;
exports.convertCSV = convertCSV;
exports.parseCommandLine = parseCommandLine;
exports.checkCommandLine = checkCommandLine;
exports.checkSqlite3Exists = checkSqlite3Exists;
exports.optionDefinitions = optionDefinitions;
exports.openEmptySqlite3 = openEmptySqlite3;
exports.openSqlite3 = openSqlite3;
exports.makeOpenSqlite3 = makeOpenSqlite3;
exports.closeSqlite3 = closeSqlite3;
exports.callSql = callSql;
exports.makeCallSql = makeCallSql;
exports.attachSql0 = attachSql0;
exports.attachSql1 = attachSql1;
exports.attachSql2 = attachSql2;
exports.makeCopyTable = makeCopyTable;
exports.copyTable = copyTable;
exports.makeSaveDbFile = makeSaveDbFile;
exports.saveDbFile = saveDbFile;
exports.addSecondAggregate = addSecondAggregate;
exports.produceExpectedOutput = produceExpectedOutput;
exports.makeProduceExpectedOutput = makeProduceExpectedOutput;
exports.cleanUp = cleanUp;
exports.makeCleanUp = makeCleanUp;
exports.exitSuccess = exitSuccess;
exports.helpercatch = helpercatch;
exports.makeReject = makeReject;