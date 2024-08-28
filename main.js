import "./style.css";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const insultMode = document.querySelector("input[name=insult]");

const badPrompt =
  "Give me a silly insult to make me laugh today, referencing plants, animals, or flowers by adding emoji. Just put the response directly.";
const goodPrompt =
  "Give me an affirmation to boost my motivation today, referencing plants, animals, or flowers by adding emoji. Don't show the prompt, only the quote. Do not add anything like Here is an affirmation... just return the affirmation alone";

async function fetchNewAffirmation() {
  disableButton(true);
  showLoadingAnimation();

  const model = document.querySelector("input[name=model]:checked");
  const length = document.querySelector("input[name=length]:checked");

  let prompt = insultMode.checked ? badPrompt : goodPrompt;
  console.log(length);
  switch (length.value) {
    case "short":
      prompt += " and make it short, 10-25 words";
      break;
    case "medium":
      prompt += " and make it medium, 25-50 words";
      break;
    case "long":
      prompt += " and make it long, 50-150 words";
      break;
  }
  console.log(prompt);

  try {
    const response = await client.send(
      new ConverseCommand({
        modelId: model.value,
        messages: [
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
      })
    );
    const affirmation = response.output.message.content[0].text;
    // set the affirmation in HTML
    document.querySelector("#affirmation").innerHTML = affirmation;
  } catch (err) {
    console.error(err);
    document.querySelector("#affirmation").innerHTML = err;
  }

  disableButton(false);
}

// Shows a loading animation while fetching a new affirmation
function showLoadingAnimation() {
  document.querySelector("#affirmation").innerHTML =
    '<div class="loading-spinner"></div>';
}

// Disables the button while fetching a new affirmation so we don't request several at once by clicking repeatedly
function disableButton(isDisabled) {
  const affirmationButton = document.querySelector("#getNewAffirmation");
  affirmationButton.disabled = isDisabled;
}

init();

// Called on page load (or refresh), fetches a new affirmation
async function init() {
  try {
    // get the user's credentials from environment variables
    const creds = await fetchCredentials();
    // instantiate the BedrockRuntimeClient
    client = await createBedrockClient(creds);
    // Once everything is setup, let's get the first affirmation
    await fetchNewAffirmation();
  } catch (err) {
    console.error(err);
    document.querySelector("#affirmation").innerHTML = err;
  }

  const affirmationButton = document.querySelector("#getNewAffirmation");
  affirmationButton.addEventListener("click", fetchNewAffirmation);
}

let client = null;
async function createBedrockClient(creds) {
  client = await new BedrockRuntimeClient({
    credentials: creds.credentials,
    region: creds.region,
  });
  return client;
}

async function fetchCredentials() {
  return {
    region: "us-west-2", // Hardcoded as this region is a requirement for the hosted Workshops and must not be changed.
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN,
    },
  };
}
