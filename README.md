# heward
Heward is a module bundler and deployment tool for Roll20

## Introduction
[Roll20](https://roll20.net/) is a virtual tabletop application that allows pen-and-paper games to be played online. As part of this experience, Roll20 Pro Users are able to write their own scripts for interacting with the application, ranging from simple macros to complex chat bots and campaign tool managers. These scripts run within the [Roll20 API Sandbox](https://wiki.roll20.net/API:Sandbox_Model), a restricted Node.js virtual machine, and have limitations imposed on them for security or simplicity reasons.

User-created scripts on Roll20 are created and edited from within a browser-based editor with limited capabilities that present serious difficulties for writing and maintaining larger scripts, especially those that would traditionally be broken into several [Node.js's modules](https://nodejs.org/api/modules.html). Heward solves this problem by serving as a compilation and deployment tool for Roll20, allowing you to write JavaScript in your favorite IDE and deploy to Roll20 as if it were a cloud computing provider.

## Install
Install with npm:
```
npm install --save-dev heward
```

Install with yarn:
```
yarn add heward --dev
```

## Usage
After installing `heward`, you'll need to setup a .env file in your project root. This should contain the following:

```bash
# The Roll20 ID for your campaign
ROLL20_CAMPAIGN=

# Your Roll20 username
ROLL20_USERNAME=

# Your Roll20 password
ROLL20_PASSWORD=
```

With that setup, you can now run `heward` from the command line:

```bash
heward --script ./src/index.js
```

Heward will compile your script using [babel-transform-roll20](https://github.com/primarilysnark/babel-transform-roll20) and then deploy it to the Roll20 API Sandbox as `heward.js`. Subsequent deployments of Heward will automatically overwrite your script and restart the sandbox, allowing you the freedom to write and deploy from your local machine.