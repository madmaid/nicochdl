import { execSync } from "child_process";
import fs  from "fs";
import path from "path";
import os from "os";
import Parser from "rss-parser";

const logPath = abspath("~/.log/nicochdl/downloads.json");

const parser = new Parser({
    customFields: {
        item: [
            ["nicoch:isPremium", "isPremium"]
        ]
    }
});


type CrawlResult= {
    [url: string]: boolean
};
async function crawl(feedURL: string, dstDir: string, log: CrawlResult): Promise<CrawlResult[]> {
    const feed = await parser.parseURL(feedURL);
    if (feed.items === undefined) return new Promise((_, reject) => reject());

    return Promise.all(feed.items.map(item => {

        const url: string = item.link || "";

        if (log[url]) return { [url] : true };
        if (item.isPremium === "true") return { [url] : false };

        const outputPath = path.join(abspath(dstDir), "%(title)s-%(id)s.%(ext)s");
        execSync(`until youtube-dl -o '${outputPath}' ${item.link}; do continue; done`);

        return { [url] : true};
    }))

}

function initFile(filePath: string, init: string) {
    try {
        fs.accessSync(filePath)
    } catch (err) {
        fs.writeFileSync(filePath, init)
    }
}

function abspath(relative: string) {
    if (relative[0] === '~') {
        return path.normalize(path.join(os.homedir(), relative.slice(1)))
    }
    return path.normalize(relative)
}


(function main(){
    // usage: ts-node /path/to/src/index.ts <channelPath> <dstDir>
    const channelPath = abspath(process.argv[2]);
    const dstDir = abspath(process.argv[3]);

    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.mkdirSync(path.dirname(channelPath), {recursive: true });
    initFile(logPath, "{}");
    initFile(channelPath, "[]");

    let log = JSON.parse(fs.readFileSync(logPath, "utf8"));
    const channels = JSON.parse(fs.readFileSync(channelPath, "utf8"));

    const crawlResults: Promise<CrawlResult[]> = Promise.all(channels.map((ch: any) => crawl(ch, dstDir, log)));
    crawlResults.then((crawled: CrawlResult[]) => 
        crawled.flat().reduce((results: CrawlResult, current: CrawlResult) => 
            Object.assign(results, current)
        , log)
    ).then((r: CrawlResult) => {
        fs.writeFileSync(logPath, JSON.stringify(r))
    });



})();
