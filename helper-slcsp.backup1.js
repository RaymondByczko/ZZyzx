let sq = require("./sqlite3-slcsp.js");
const fs = require('fs');
const fsPromises = fs.promises;
let child_process = require('child_process');
// const sqlite3 = require('sqlite3').verbose();
const sqlite3 = require('better-sqlite3');
const commandLineArgs = require('command-line-args');

/*
 * Client code of this module can call this to make
 * sure the module is read and processed correctly.
 */
function helper() {
    console.log("helper in helper-slcsp.js");
}

async function pCommandLineArgs(optionDefinitions) {
    console.log('pCommandLineArgs:start');
    let opt = await commandLineArgs(optionDefinitions);
    return Promise.resolve(opt);
}

async function copyToOptions(pOptions, options){
    // Make the options also available to the caller of promise chain.
    console.log("copyToOptions:start");
    options = pOptions;
    console.log("then options="+JSON.stringify(options));
    console.log("pOptions="+JSON.stringify(pOptions));
    return pOptions;
}

async function makeCopyToOptions(options) {
    return async function(pOptions) {
        await copyToOptions(pOptions, options);
        return pOptions;
    }
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
async function makeConvertCSV(csvFile,dbFile,dbTable,cwd) {
    console.log("makeConvertCSV:start");
    console.log("makeConvertCSV:csvFile="+csvFile);
    console.log("makeConvertCSV:dbFile="+dbFile);
    return async function(priorResult){
        console.log("anonymous function:start");
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
    console.log("convertCSV:start");
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
                console.log("runCommand:err="+err);
                reject(err);
            } else {
                console.log("runCommand:stdout="+stdout);
                resolve(stdout);
            }
        });
    });
}

/*
 * Given the options that are actually given to the program
 * when invoked, this async function determines if the
 * expected ones are given.
 */
async function parseCommandLine(options) {
    console.log("parseCommandLine:start");
    console.log("...options="+options);
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
        "output"
    ];
    let allPresent = true;

    let firstMissing = undefined;
    expectedOptions.forEach((element) => {
        let hasIt = options.hasOwnProperty(element);
        allPresent = allPresent && hasIt;
        if (!hasIt){
            firstMissing = element;
        }
    });
    let retObj = {
        allPresent: allPresent,
        firstMissing: firstMissing,
        options: options
    };
    console.log("parseCommandLine:end");
    return Promise.resolve(retObj);

}

/*
 *Are the files specified on the command line
 * actually in the file system?
 * @todo check for existence of csvfile0 and its
 * related files.
 */
async function checkCommandLine(resultPrevious) {
    console.log("checkCommandLine");
    console.log("... resultPrevious="+JSON.stringify(resultPrevious));
    if (!resultPrevious.allPresent) {
        throw new Error("checkCommandLine:allPresent not true");
    }
    if (resultPrevious.allPresent) {
        let csvfile1 = resultPrevious.options.csvfile1;
        let dbfile1 = resultPrevious.options.dbfile1;
        let cwd1 = resultPrevious.options.cwd1;
        let path1 = cwd1 + csvfile1;
        try {
            await fsPromises.access(path1, fs.constants.R_OK);
        } catch (err) {
            console.log("err=" + err);
            throw err;
        }
        let csvfile2 = resultPrevious.options.csvfile2;
        let dbfile2 = resultPrevious.options.dbfile2;
        let cwd2 = resultPrevious.options.cwd2;
        let path2 = cwd2 + csvfile2;
        try {
            await fsPromises.access(path2, fs.constants.R_OK);
        } catch (err) {
            console.log("err=" + err);
            throw err;
        }
        try {
            let path1Stat = await fsPromises.stat(path1);
            console.log("path1Stat.size="+path1Stat.size);
            if (path1Stat.size == 0) {
                throw Error("csvfile1 is zero size");
            }
        } catch (err) {
            console.log("err="+err);
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
    console.log('checkSqlite3Exists:start');
    console.log('... priorResult='+ priorResult);
    let cmd = 'which sqlite3'

    try {
        let s3 = await runCommand(cmd);
        console.log("...s3=" + s3);
        if (s3 != "") {
            return "sqlite3 is installed";
        }
    }
    catch (e) {
        console.log("checkSqlite3Exists:e=" + e);
        return Promise.reject("need to install sqlite3");
    }
}

/*
 * All of the command-line options for mainslcsp.js are given
 * here.
 */
function optionDefinitions(){
    const od = [
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
    console.log("openEmptySqlite3:start");
    // let objDB = await new sqlite3.Database(":memory");
    let objDB = await new sqlite3(":memory:");
    return Promise.resolve(objDB);
}

/*
 * @todo the following may be refactored with the above.
 */
async function openSqlite3(pathName) {
    console.log("openSqlite3:start");
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
    console.log("callSql:start");
    console.log("callSql:sqlSt="+sqlSt);
    console.log("callSql:currentDb="+currentDb);
    // let attachSql = "ATTACH DATABASE '" + cwd1 + dbFile1 + "' " + 'AS' + ' ' + dbName1;
    await awaitCallSql(currentDb, sqlSt);
    return Promise.resolve("attacheDB: success");
}

/*
 * Allows the sql statement to be delivered to an async function
 * definition, by means of a closure.  In this way, callSql can participate
 * in a promise chain which likes single parameter async functions.
 */
async function makeCallSql(sqlSt){
    // let attachSql = "ATTACH DATABASE '" + cwd1 + dbFile1 + "' " + 'AS' + ' ' + dbName1;
    return async function(currentDB){
        console.log("makeCallSql:closure:currentDB="+currentDB);
        await callSql(currentDB, sqlSt);
        return Promise.resolve(currentDB);
    }
}

/*
 * Given options, attachSql0 will produce the correct SQL to attach a database file
 * in sqlite3. This is for the zero-th database file.
 */
function attachSql0(options) {
    console.log("attachSql1:options="+JSON.stringify(options));
    // @todo possibly use something other than dbtable1
    let retSql = "attach database '" + options.cwd0 + options.dbfile0 + "' " + 'AS' + ' ' + options.dbtable0;
    return retSql;
}

/*
 * Given options, attachSql1 will produce the correct SQL to attach a database file
 * in sqlite3. This is for the first database file.
 */
function attachSql1(options) {
    console.log("attachSql1:options="+JSON.stringify(options));
    // @todo possibly use something other than dbtable1
    let retSql = "attach database '" + options.cwd1 + options.dbfile1 + "' " + 'AS' + ' ' + options.dbtable1;
    return retSql;
}

/*
 * Given options, attachSql2 will produce the correct SQL to attach a database file
 * in sqlite3. This is for the second database file.
 */
function attachSql2(options) {
    console.log("attachSql1:options="+JSON.stringify(options));
    // @todo possibly use something other than dbtable2
    let retSql = "ATTACH DATABASE '" + options.cwd2 + options.dbfile2 + "' " + 'AS' + ' ' + options.dbtable2;
    return retSql;
}

async function awaitCallSql(objDB, sqlSt) {
    console.log('awaitCallSql:start');
    console.log('awaitCallSql:objDB='+objDB);
    console.log('awaitCallSql:sqlSt='+sqlSt);
    return retVal = await new Promise((resolve, reject) => {
        let stmt = objDB.prepare(sqlSt);
        stmt.run();
        // objDB.exec(attachSql);
        console.log("awaitCallSql:exec-post");
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

async function makeCopyTable(originalTable, newTable) {
    return async function(db) {
        await copyTable(db, originalTable, newTable);
        return db;
    }
}
async function copyTable(db, originalTable, newTable) {
    console.log("copyTable:start");
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
    console.log("info=" + info);
    return Promise.resolve(db);
}

function makeSaveDbFile(pathName) {
    return async function(objDB){
        await saveDbFile(objDB, pathName);
        return Promise.resolve(objDB);
    }
}
/// MOVE START

/// MOVE END

async function saveDbFile(objDb, pathName) {
    console.log("saveDbFile:start");
    let  dbBackup = await objDb.backup(pathName);
    console.log("dbBackup="+ JSON.stringify(dbBackup));
    // await objDb.close();
    return objDb;
}
/*
 * An aggregate (or summary) function to figure out the second highest
 * value in a certain column.  For the moment, this will be utilized
 * on the rate column of the plans table in the slcsp data.
 */
async function addSecondAggregate(objDb){
    console.log("addSecondAggregate:start");
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
    console.log("addSecondAggregate:end");
    return objDb;
}

function helpercatch(res) {
    console.log("helpercatch:res="+res);
}

function makeReject(caller) {
    return async function(rejectResult) {
        console.log("makeReject:caller="+caller);
        return Promise.reject("caller="+caller);
    }
}

exports.helper = helper;
exports.pCommandLineArgs = pCommandLineArgs;
exports.makeCopyToOptions = makeCopyToOptions;
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
exports.helpercatch = helpercatch;
exports.makeReject = makeReject;