"use strict";

var fs              = require("fs");
var pkg             = require("./package.json");
var headerTemplate  = fs.readFileSync("header.txt");
var headerVars      = {
    name            : "LoadingOverlay",
    author          : "Gaspare Sganga",
    description     : pkg.description,
    version         : pkg.version,
    license         : pkg.license,
    documentation   : pkg.homepage
};

var paths = {
    src     : "src/",
    dest    : "dist/"
}

var gulp        = require("gulp");
var del         = require("del");
var inquirer    = require("inquirer");
var rename      = require("gulp-rename");
var replace     = require("gulp-replace");
var header      = require("gulp-header");
var sourcemaps  = require("gulp-sourcemaps");
var uglify      = require("gulp-uglify");


function src_headers(){
    return gulp.src([paths.src + "*.js", paths.src + "*.css"])
        .pipe(replace(/^\/\*{99}[^*]+\*{99}\/(\r\n|\r|\n)/, ""))
        .pipe(header(headerTemplate, headerVars))
        .pipe(gulp.dest(paths.src));
}


function dist_clean(){
    return del([paths.dest + "*"]);
}

function dist_js(){
    return gulp.src(paths.src + "*.js")
        .pipe(gulp.dest(paths.dest))
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(header(headerTemplate, headerVars))
        .pipe(rename({
            extname : ".min.js"
        }))
        .pipe(sourcemaps.write("./", {
            addComment : false
        }))
        .pipe(gulp.dest(paths.dest));
}


gulp.task("default", function(){
    return inquirer.prompt([{
        type        : "list",
        name        : "task",
        message     : "Select the task to run",
        choices     : [
            {
                name    : "Update source headers",
                value   : "src"
            },
            {
                name    : "Update dist",
                value   : "dist"
            },
            {
                name    : "Exit",
                value   : "exit"
            }
        ],
        pageSize    : "3"
    }]).then(function(ret){
        switch (ret.task) {
            case "src":
                gulp.parallel(src_headers)();
                break;
                
            case "dist":
                gulp.series(dist_clean, dist_js)();
                break;
            
            default:
                console.log("\nNothing done\n");
        }
    });
});