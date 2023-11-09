import "dotenv/config"
import OpenAI from "openai"
import fs from "fs"
import path from "path"
import sharp from "sharp"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GPT4_PROMPT_COST = 0.01 / 1000 // per token
const GPT4_COMPLETION_COST = 0.03 / 1000 // per token

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

async function imageToJpgBase64(imagePath: string) {
  const img = fs.readFileSync(imagePath)
  const s = sharp(img)
  // convert to jpg by sharp
  // get dimensions
  const { width, height } = await s.metadata()
  console.log(`Image dimensions: ${width}x${height}`)
  const buffer = await sharp(img).jpeg().toBuffer()
  return buffer.toString("base64")
}

async function describeImage(imagePath: string) {
  const imageBase64 = await imageToJpgBase64(imagePath)
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What are in this image?" },
          {
            type: "image_url",
            image_url: {
              "url": `data:image/jpeg;base64,${imageBase64}`
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });

  const { usage, choices } = response
  if (!usage) {
    throw new Error("No usage")
  }
  const promptCost = usage.prompt_tokens * GPT4_PROMPT_COST
  const completionCost = usage.completion_tokens * GPT4_COMPLETION_COST
  const totalCost = promptCost + completionCost
  console.log(usage)
  console.log(`Total cost: $${totalCost}`)
  console.log(choices[0])
}

async function main() {
  const imageDir = path.join(__dirname, "../images")
  // list all files in the directory
  fs.readdir(imageDir, async (err, files) => {
    if (err) {
      console.log("Error getting directory information.")
    } else {
      // loop through all the files in the directory
      for (const file of files) {
        // make sure the file is an image
        if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png")) {
          console.log(file)
          const imagePath = path.join(imageDir, file)
          const start = new Date().getTime()
          await describeImage(imagePath)
          const end = new Date().getTime()
          console.log(`Time taken: ${end - start}ms`)
        }
      }
    }
  })
}

main();