const axios = require("axios");
const chalk = require("chalk");
const ora = require("ora");
const { stringify } = require("querystring");
const { inspect } = require("util");

const apiUrl = "http://localhost:3000";

/**
 * Parse and display account.
 * @param {Array} account - Account user array.
 * @param {Array} transactions
 */
function displayLog(account, transactions) {
  const arrayToDisplay = [];

  transactions.forEach(function (t, i) {
    const transactionsArray = [];

    t.transactions.forEach(function (el) {
      transactionsArray.push({
        label: el.label,
        amount: el.amount,
        currency: el.currency,
      });
    });

    arrayToDisplay.push({
      acc_number: account[i].acc_number,
      amount: account[i].amount,
      transactions: [...transactionsArray],
    });
  });

  return process.stdout.write(
    inspect(arrayToDisplay, {
      colors: true,
      depth: null,
    })
  );
}

async function main() {
  const spinner = ora({
    text: `chalk{gray Start fetchin refresh token}`,
    interval: 1000,
    frames: ["🙂", "🙃"],
  }).start();
  const keepInMemory = {};

  try {
    const l = await axios.post(
      `${apiUrl}/login`,
      { user: "BankinUser", password: "12345678" },
      {
        headers: {
          Authorization: `Basic ${Buffer.from("BankinClientId:secret").toString(
            "base64"
          )}`,
          "Content-Type": "Application/json",
        },
      }
    );
    keepInMemory.refreshToken = l.data.refresh_token;

    spinner.text = chalk`{gray Done ! Now let's find an acess_token}`;
    const d = await axios.post(
      "http://localhost:3000/token",
      stringify({
        grant_type: "refresh_token",
        refresh_token: keepInMemory.refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    keepInMemory.accessToken = d.data.access_token;

    spinner.text = chalk`{gray Let's retrieve account information's}`;
    const p = await axios.get(`${apiUrl}/accounts`, {
      headers: {
        Authorization: `Bearer ${keepInMemory.accessToken}`,
        "Content-Type": "Application/json",
      },
    });
    keepInMemory.accounts = p.data;

    spinner.text = chalk`{gray Start fetching transactions}`;
    const m = keepInMemory.accounts.account.map(async function (i) {
      const a = await axios.get(
        `http://localhost:3000/accounts/${i.acc_number}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${keepInMemory.accessToken}`,
            "Content-Type": "Application/json",
          },
        }
      );

      return a.data;
    });

    spinner.succeed("It's all done :)");
    return Promise.all([...m]).then((r) => displayLog(keepInMemory.accounts.account, r));
  } catch (error) {
    throw error;
  }
}

// Start the main process.
main()
  .catch((e) => process.stdout.write(chalk`{bgRed ${e.message}}`))
  .then();
