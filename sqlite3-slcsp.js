let execSync = require('child_process').execSync;
let debug = require('debug')('helper:debug');
let prod = require('debug')('helper:prod');
/*
 * Sqlite3Slcsp encapsulates the functionality required in
 * one of the first steps to process Slcsp data.  That step
 * is to convert a *.csv file to a sqlite3 database
 * file.  (I call it a *.db file.).
 *
 * To get this done, we are relying on sqlite3's ".import"
 * dot command.  After significant research and looking,
 * a counterpart to ".import" does not seem to exist in a sqlite
 * package within the node package ecosystem.
 *
 * I scratch my head as to 'why' this is the case, since
 * there must be a need to convert csv into
 * a RDBMS type format.  So for now, use this class,
 * and it can be retrofitted when something better is found.
 */
class Sqlite3Slcsp {
    /*
     * Load the requirements to do *.csv to *.db conversion.
     * The csv file to convert is given by csvFile,
     * and it will be converted to the db file at
     * dbFile.  Both files are assumed to exist
     * at cwd.  The contents of csvFile need to live
     * in a database table, so that is specified by
     * dbTable.
     */
    constructor(csvFile, dbFile, dbTable, cwd) {
        this.csvFile = csvFile;
        this.dbFile = dbFile;
        this.dbTable = dbTable;
        this.cwd = cwd;
    }
    produceDBfile() {
        debug("produceDBfile:start");
        // let command = "echo '-n' '.mode csv\n.import zips.csv zipstable\n.save zipstable.db\n.exit'|sqlite3";
        let command = "echo" + " ";
        command+= "'-n'" + " ";
        command+= "'.mode csv\n";
        command+= ".import " + this.cwd + this.csvFile + " " + this.dbTable + "\n";
        command+= ".save " + this.cwd + this.dbFile + "\n";
        command+= ".exit" + "\n";
        command+= "'";
        command+= "|";
        command+= "sqlite3";


        debug("command="+ command);
        // command+= ""
        const execOptions = {
            // 'cwd':__dirname
            'cwd': this.cwd
        };
        execSync(command, execOptions, (err, stdout, stderr) => {
            if (err) {
                debug('err=' + err);
                // Possible throw here @todo
            } else {
                debug('command ok');
                debug('stdout=' + stdout);
            }
        });
    }
    /*
     * @todo releaseFiles needs to either be implemented and documented,
     * or it needs to be deleted.
     */
    releaseFiles() {
        let fileToBeDeleted = this.cwd + this.dbFile;
        debug('fileToBeDeleted='+fileToBeDeleted);
    }
};

/*
 * This is an example of the triple join necessary to grab the rate area tuplet
 * by zipcode.  However, it does not consider other requirements.
 * One aspect not considered is have multiple rate areas (tuplet) per
 * zip, and to exclude them.  This is just a very good solution that is not
 * complete.  This is used for prototyping at the moment.
 */
function tripleJoinSlcspZipsPlansSQL() {
    let sqlSt = "select slcsp.zipcode as ZIP, zips.state as ST, zips.rate_area as RA, plans.plan_id as ID, plans.rate as RATE";
    sqlSt += " ";
    sqlSt += "from slcsp";
    sqlSt += " ";
    sqlSt += "inner join zips on slcsp.zipcode=zips.zipcode";
    sqlSt += " ";
    sqlSt += "inner join plans on (zips.state=plans.state) and (zips.rate_area=plans.rate_area)";
    sqlSt += " ";
    sqlSt += "where (plans.metal_level='Silver')";
    sqlSt += " ";
    sqlSt += "order by slcsp.zipcode, plans.rate";
    sqlSt += " ";
    sqlSt += "limit 20";
    return sqlSt;
}
/*
 * @todo possibly move this to helper-slscp.js
 */
/*
 * Creates an independent table attempting to solve the Ad Hoc Slcsp homework
 * assignment.   Except for minor sql against the independent table, this
 * should be close to a solution.  This table is a step to a solution.
 * It does not specify the 2nd lowest of each tuplet (pair) rate area.
 * (that is state, rate_area).  However since all rates for each tuplet
 * rate area, it can be deduced.
 */
function adHocSlcspSQL() {
    let sqlSt = "create table slcspnew as";
    sqlSt += " ";
    sqlSt += "select slcsp.zipcode, zips.state, zips.rate_area, plans.rate";
    sqlSt += " ";
    sqlSt += "from slcsp";
    sqlSt += " ";
    sqlSt += "inner join zips on slcsp.zipcode = zips.zipcode";
    sqlSt += " ";
    sqlSt += "inner join plans on (zips.state = plans.state) and (zips.rate_area = plans.rate_area)";
    sqlSt += " ";
    sqlSt += "where zips.zipcode not in (";
    sqlSt += "select zips.zipcode";
    sqlSt += " ";
    sqlSt += "from zips";
    sqlSt += " ";
    sqlSt += "group by zips.zipcode";
    sqlSt += " ";
    sqlSt += "having count(DISTINCT zips.state||zips.rate_area) >1";
    sqlSt += ") and (";
    sqlSt += "plans.metal_level='Silver'";
    sqlSt += ")";
    sqlSt += " ";
    sqlSt += "order by slcsp.zipcode, zips.state, zips.rate_area, plans.rate;";
    return sqlSt;
}

/*
 * This function produces the sql allowing the second lowest
 * value per rate area tuplet to be produced.  It relies
 * on the table produced by adHocSlcspSQL.
 */
function adHocSlcspSecondSql() {
    let sqlSt = "create table slcspnewsecond as";
    sqlSt += " ";
    sqlSt += "select zipcode, state, rate_area, getSecond(rate)";
    sqlSt += " ";
    sqlSt += "from slcspnew";
    sqlSt += " ";
    sqlSt += "group by zipcode, state, rate_area;";
    return sqlSt;
}

exports.Sqlite3slcsp = Sqlite3Slcsp;
exports.tripleJoinSlcspZipsPlansSQL = tripleJoinSlcspZipsPlansSQL;
exports.adHocSlcspSQL = adHocSlcspSQL;
exports.adHokSlcspSecondSql = adHocSlcspSecondSql;