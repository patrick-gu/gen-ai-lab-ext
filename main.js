import "./style.css";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const llama3Id = "meta.llama3-1-8b-instruct-v1:0";
const mistralId = "mistral.mistral-7b-instruct-v0:2";
const prompt =
  "Give me an affirmation to boost my motivation today, referencing plants, animals, or flowers by adding emoji. Don't show the prompt, only the quote. Do not add anything like Here is an affirmation... just return the affirmation alone";
const conversation = [
  {
    role: "user",
    content: [{ text: prompt }],
  },
];

async function fetchNewAffirmation(modelId) {
  disableButton(true);
  showLoadingAnimation();

  try {
    const response = await client.send(
      new ConverseCommand({ modelId, messages: conversation }),
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

async function generateLlama() {
  await fetchNewAffirmation(llama3Id);
}

async function generateMistral() {
  await fetchNewAffirmation(mistralId);
}

// Shows a loading animation while fetching a new affirmation
function showLoadingAnimation() {
  document.querySelector("#affirmation").innerHTML =
    '<div class="loading-spinner"></div>';
}

// Disables the button while fetching a new affirmation so we don't request several at once by clicking repeatedly
function disableButton(isDisabled) {
  const llamaButton = document.querySelector("#getNewAffirmationLlama");
  const mistralButton = document.querySelector("#getNewAffirmationMistral");
  llamaButton.disabled = isDisabled;
  mistralButton.disabled = isDisabled;
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
    await generateLlama();
  } catch (err) {
    console.error(err);
    document.querySelector("#affirmation").innerHTML = err;
  }

  const affirmationButton = document.querySelector("#getNewAffirmationLlama");
  affirmationButton.addEventListener("click", generateLlama);
  const affirmationButton2 = document.querySelector(
    "#getNewAffirmationMistral",
  );
  affirmationButton2.addEventListener("click", generateMistral);
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
    },
  };
}
