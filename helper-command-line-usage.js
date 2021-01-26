/*
 * This file is a helper for command line usage.  It defines content
 * and description strings.  Thus these things are stored here
 * and utilized by the main program and other helpers.
 *
 * By storing these content and description strings here, it
 * helps keep file sizes (in terms of number of lines in source code
 * files) smaller.
 *
 * This definition of various strings in this way also allows the
 * programmer to write multi-line strings by using the '+=' operator.
 * Its easier to see one one page and does not go off page as much.
 */

function header_content() {
    let hc = "";
    hc += 'Given csv files, compute the second lowest rate.';
    hc += '  The implementation uses sqlite3 database files, which can be ';
    hc += 'preserved for any reason, or automatically discarded.';
    hc += '  Certain options cannot be used with others.  "help" option';
    hc += '  cannot be used with other options.  If other options are ';
    hc += 'specified, the invocation acts like only "help" was specified.  ';
    hc += 'The rest of options are ignored in this case.';
    return hc;
}

function csvf0_description() {
    let description = "The first csvfile representing desired zip codes for ";
    description += "slscp.  It is these zipcodes for which the second lowest ";
    description += "silver rate is desired. This file must exist before program ";
    description += "execution."
    return description;
}

function dbfile0_description() {
    let description = "The database file corresponding to csvfile0.  ";
    description += "This is a sqlite3 file produced by this program.  ";
    description += "This file is produced by program execution.  It can be ";
    description += "kept for review to verify results etc."
    return description;
}

function dbtable0_description() {
    let description = "The table name into which csv data from csvfile0 ";
    description += "is imported into dbfile0.";
    return description;
}

function cwd0_description() {
    let description = "The working directory for csvfile0 and dbfile0.";
    return description;
}

function csvfile1_description() {
    let description = "The second csvfile representing all known zipcode data, which maps zipcode to state, rate_area etc.";
    return description;
}

function dbfile1_description() {
    let description = "The database file corresponding to csvfile1.";
    return description;
}

function dbtable1_description() {
    let description = "The table name into which csv data from csvfile1 is ";
    description += "imported into dbfile1.";
    return description;
}

exports.header_content = header_content;
exports.csvf0_description = csvf0_description;
exports.dbfile0_description = dbfile0_description;
exports.dbtable0_description = dbtable0_description;
exports.cwd0_description = cwd0_description;
exports.csvfile1_description = csvfile1_description;
exports.dbfile1_description = dbfile1_description;
exports .dbtable1_description = dbtable1_description;