//npm init -y
//node Cricinfo.js --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" --dirname="World_Cup_2K19"

let minimist = require("minimist");
let fs = require("fs");
let axios = require("axios");
let jsdom = require("jsdom");
let pdf = require("pdf-lib");
let excel = require("excel4node");
let path = require("path");



let args = minimist(process.argv);

let dldpromise = axios.get(args.source);
dldpromise.then(function (response) {
    let html = response.data;

    let JSDOM = jsdom.JSDOM;
    let dom = new JSDOM(html);
    let document = dom.window.document;
    let matches = [];


    let matchdivs = document.querySelectorAll("div.match-info.match-info-FIXTURES");
    for (let i = 0; i < matchdivs.length; i++) {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };


        let matchdiv = matchdivs[i];
        let names = matchdiv.querySelectorAll("div.name-detail > p.name");
        match.t1 = names[0].textContent;
        match.t2 = names[1].textContent;

        let scores = matchdiv.querySelectorAll("div.score-detail > span.score");
        if (scores.length == 2) {
            match.t1s = scores[0].textContent;
            match.t2s = scores[1].textContent;
        }
        else if (scores.length == 1) {
            match.t1s = scores[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let r = matchdiv.querySelector("div.status-text > span");
        match.result = r.textContent;

        matches.push(match);
    }

    let teams = [];

    for (let i = 0; i < matches.length; i++) {
        teams = fillTeamsArray(matches[i], teams);
    }

    //console.log(teams);

    //converting teams array to json

    let teamsjson = JSON.stringify(teams);
    //console.log(teamsjson);
    fs.writeFileSync("cricinfojson.json", teamsjson, "utf-8");
    create_excelfile(teams);
    create_folders(teams, args.dirname);

})

function fillTeamsArray(match, teams) {
    t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        let team = {
            name: match.t1,
            matches: []
        }
        teams.push(team);
    }
    else {
        let matchesoft1 = {
            vs: match.t2,
            myscore: match.t1s,
            opponentscore: match.t2s,
            result: match.result

        }
        teams[t1idx].matches.push(matchesoft1);
    }

    //////////////////////////////////////////////

    t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }


    if (t2idx == -1) {
        let team = {
            name: match.t2,
            matches: []
        }
        teams.push(team);
    }
    else {
        let matchesoft2 = {
            vs: match.t1,
            myscore: match.t2s,
            opponentscore: match.t1s,
            result: match.result

        }
        teams[t2idx].matches.push(matchesoft2);
    }



    return teams;
}

function create_excelfile(teams) {
    let wb = new excel.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let ws = wb.addWorksheet(teams[i].name);

        ws.cell(1, 1).string("OPPONENT");
        ws.cell(1, 2).string("SELF SCORE");
        ws.cell(1, 3).string("OPPONENT SCORE");
        ws.cell(1, 4).string("RESULT");


        for (let j = 0; j < teams[i].matches.length; j++) {
            ws.cell(j + 2, 1).string(teams[i].matches[j].vs);
            ws.cell(j + 2, 2).string(teams[i].matches[j].myscore);
            ws.cell(j + 2, 3).string(teams[i].matches[j].opponentscore);
            ws.cell(j + 2, 4).string(teams[i].matches[j].result);
        }

    }
    wb.write("WorldCup_2k19.csv");
}

function create_folders(teams, dirname) {
    if (fs.existsSync(dirname) == true) {
        fs.rmdirSync(dirname, { recursive: true });
    }
    fs.mkdirSync(dirname);

    for (let i = 0; i < teams.length; i++) {
        let FolderName = path.join(dirname, teams[i].name);
        if (fs.existsSync(FolderName) == false) {

            fs.mkdirSync(FolderName);
        }

        for (let j = 0; j < teams[i].matches.length; j++) {
            let match = teams[i].matches[j];
            create_pdfs(FolderName, teams[i].name, match);
        }
    }
}

function create_pdfs(parentfolder, hometeam, match) {
    let filename = path.join(parentfolder, match.vs);
    //step 1:read bites from hard Disk
    let templatebytes = fs.readFileSync("worldCupTemplate.pdf");
    //step 2:load the above bites in the pdf 
    let loadBytesPromise = pdf.PDFDocument.load(templatebytes);
    loadBytesPromise.then(function (pdfDoc) { //if the promise is fullfilled we get a pdf doc here
        let page = pdfDoc.getPage(0);  //here we are taking out the page
        page.drawText(hometeam, {
            x: 300,
            y: 700,
            size: 16,
            //font:timesRomanFont
        });
        page.drawText(match.vs, {
            x: 300,
            y: 660,
            size: 16,
            //font:Arial Black
        });
        page.drawText(match.myscore, {
            x: 300,
            y: 625,
            size: 16,
            //font:Arial Black
        });
        page.drawText(match.opponentscore, {
            x: 300,
            y: 583,
            size: 16,
            //font:Arial Black
        });
        page.drawText(match.result, {
            x: 215,
            y: 545,
            size: 16,
            // font:Arial Black
        });

        let changedBytesPromise = pdfDoc.save();//promise to save the changed Bytes
        changedBytesPromise.then(function (changedBytes) {
            if (fs.existsSync(filename + ".pdf") == true) {
                fs.writeFileSync(filename + "1.pdf", changedBytes);
            }
            else {
                fs.writeFileSync(filename + ".pdf", changedBytes);
            }
        })
    })
}
//node Cricinfo.js --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" --dirname="World_Cup_2K19"