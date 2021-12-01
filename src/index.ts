import * as core from '@actions/core';
import * as github from '@actions/github';
import {Webhooks} from '@octokit/webhooks'

function versionRegex() {
    const prefix = core.getInput('prefix');
    return new RegExp(`${prefix}(\\d+)\\.(\\d+)\\.(\\d+)`);
}

async function findLastVersion(): Promise<string | undefined> {
    const token = core.getInput('token');

    const {data} = await github.getOctokit(token).rest.repos.listTags({...github.context.repo});
    console.log('Found tags', data.map((t: { name: any; }) => t.name))

    const regex = versionRegex();
    const versions = data.map((t: { name: string; }) => t.name.match(regex)).filter((v: any) => !!v) as RegExpMatchArray[];
    console.log('Found previous versions', versions.map(v => v[0]))

    const s = (a: RegExpMatchArray) => {
        const [, m, r, b] = a.map(v => Number.parseInt(v));
        return m * 1000000 + r * 1000 + b
    };
    const latest = versions.sort((a, b) => s(a) - s(b))[0];

    return data[versions.indexOf(latest)]?.name;
}

async function run() {
    const lastVersion = await findLastVersion();

    if (lastVersion) {
        console.log('Found last version', lastVersion)
        core.setOutput('tag', lastVersion)
    } else {
        const prefix = core.getInput('prefix');
        const fallback = core.getInput('fallback') || `${prefix}1.0.0`
        console.log('Did not find last version, using fallback', fallback)
        if (!versionRegex().test(fallback)) {
            throw new Error(`Fallback '${fallback}' is not a valid version`)
        }
        core.setOutput('tag', fallback);
    }
}

run().catch(e => core.setFailed(e.message));
