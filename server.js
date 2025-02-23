require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

let PDFMerger, GoogleGenerativeAI, generativeModel;
(async () => {
  const pdfMergerModule = await import("pdf-merger-js");
  PDFMerger = pdfMergerModule.default;

  const genAIModule = await import("@google/generative-ai");
  GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  generativeModel = client.getGenerativeModel({
    model: "models/gemini-2.0-flash-thinking-exp-01-21",
  });
})().catch((err) => {
  console.error("Error loading ESM modules:", err);
});

const app = express();
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

const upload = multer({ dest: "uploads/" });

app.post("/merge-and-summarize", upload.array("files"), async (req, res) => {
  try {
    if (!PDFMerger || !generativeModel) {
      return res
        .status(500)
        .json({ error: "Modules not loaded yet. Try again later." });
    }

    const pdfMerger = new PDFMerger();
    for (const file of req.files) {
      await pdfMerger.add(file.path);
    }
    const uniqueId = uuidv4();
    const mergedFilename = `merged-${uniqueId}.pdf`;
    await pdfMerger.save(`./uploads/${mergedFilename}`);

    const mergedPdfData = fs.readFileSync(`./uploads/${mergedFilename}`);
    const base64Pdf = mergedPdfData.toString("base64");

    const userPrompt = `
You are a tax analysis assistant. The user has provided one or more PDFs containing Form 16, investment proofs, etc. 
They want a comparison between old and new tax regime in India. You have to go through the details of all the files. Based on your knowledge you have to calulate and give all the values as per their documents.

You must return your analysis as a valid JSON object in a code block that starts with \`\`\`json and ends with \`\`\`. 
No additional text outside that code block. 

Required JSON structure example:
{
  "taxComparison": {
    "description": "Comparison of Tax Calculation under Old and New Tax Regimes",
    "oldRegime": {
      "title": "Old Tax Regime",
      "grossSalary": {
        "label": "Gross Salary",
        "amount": null,
        "description": "Total Gross Salary as per Form 16"
      },
      "exemptions": {
        "title": "Exemptions (Section 10)",
        "totalExemptions": {
          "label": "Total Exemptions",
          "amount": null,
          "description": "Total amount of exemptions claimed under Section 10"
        },
        "exemptionDetails": [
          {
            "label": "Travel Concession/Assistance (10(5))",
            "amount": null
          },
          {
            "label": "Death-cum-Retirement Gratuity (10(10))",
            "amount": null
          },
          {
            "label": "Commuted Value of Pension (10(10A))",
            "amount": null
          },
          {
            "label": "Leave Salary Encashment (10(10AA))",
            "amount": null
          },
          {
            "label": "House Rent Allowance (10(13A))",
            "amount": null
          },
          {
            "label": "Other Special Allowances (10(14))",
            "amount": null
          },
          {
            "label": "Any Other Exemption (Section 10)",
            "amount": null
          }
        ]
      },
      "deductions": {
        "title": "Deductions",
        "totalDeductions": {
          "label": "Total Deductions",
          "amount": null,
          "description": "Total Deductions under Section 16 and Chapter VI-A"
        },
        "section16Deductions": {
          "title": "Deductions under Section 16",
          "deductionDetails_16": [
            {
              "label": "Standard Deduction (16(ia))",
              "amount": null
            },
            {
              "label": "Entertainment Allowance (16(ii))",
              "amount": null
            },
            {
              "label": "Tax on Employment (16(iii))",
              "amount": null
            }
          ],
          "totalSection16": {
            "label": "Total Deduction under Section 16",
            "amount": null
          }
        },
        "chapterVIADeductions": {
          "title": "Deductions under Chapter VI-A",
          "deductionDetails_VIA": [
            {
              "label": "Life Insurance Premium, PF, etc. (80C)",
              "amount": null
            },
            {
              "label": "Contribution to Pension Funds (80CCC)",
              "amount": null
            },
            {
              "label": "Taxpayer Pension Scheme Contribution (80CCD(1))",
              "amount": null
            },
            {
              "label": "Amount Paid/Deposited to Notified Pension Scheme (80CCD(1B))",
              "amount": null
            },
            {
              "label": "Employer Pension Scheme Contribution (80CCD(2))",
              "amount": null
            },
            {
              "label": "Health Insurance Premia (80D)",
              "amount": null
            },
            {
              "label": "Interest on Loan for Higher Education (80E)",
              "amount": null
            },
            {
              "label": "Employee Agnipath Scheme Contribution (80CCH)",
              "amount": null
            },
            {
              "label": "Central Govt. Agnipath Scheme Contribution (80CCH)",
              "amount": null
            },
            {
              "label": "Donations to Funds, Charitable Institutions (80G)",
              "amount": null
            },
             {
              "label": "Interest on Savings Account Deposits (80TTA)",
              "amount": null
            },
            {
              "label": "Any Other Deduction (Chapter VI-A)",
              "amount": null
            }
          ],
          "totalChapterVIA": {
            "label": "Total Deduction under Chapter VI-A",
            "amount": null
          }
        }
      },
      "taxableIncome": {
        "label": "Taxable Income",
        "amount": null,
        "description": "Income chargeable under the head Salaries"
      },
      "taxPayable": {
        "label": "Tax Payable",
        "amount": null,
        "description": "Tax on Total Income as per Old Regime"
      }
    },
    "newRegime": {
      "title": "New Tax Regime",
      "grossSalary": {
        "label": "Gross Salary",
        "amount": null,
        "description": "Total Gross Salary as per Form 16"
      },
      "deductions": {
        "title": "Deductions",
        "totalDeductions": {
          "label": "Total Deductions",
          "amount": null,
          "description": "Limited Deductions available in New Regime"
        },
         "deductionDetails_newRegime": [
            {
              "label": "Standard Deduction (16(ia))",
              "amount": null
            }
          ]
      },
      "taxableIncome": {
        "label": "Taxable Income",
        "amount": null,
        "description": "Taxable Income under New Regime"
      },
      "taxPayable": {
        "label": "Tax Payable",
        "amount": null,
        "description": "Tax on Total Income as per New Regime"
      }
    },
    "comparisonSummary": {
      "regimeSavings": {
        "label": "Tax Savings (if negative, then loss)",
        "amount": null,
        "description": "Difference between Tax Payable in Old Regime and New Regime (Old - New)"
      },
      "regimeRecommendation": {
        "label": "Recommended Regime",
        "text": "To be calculated based on tax amounts",
        "description": "Regime with lower tax liability is recommended"
      }
    }
  }
}

Analyze the attached PDF (base64-encoded) and produce the JSON above.
`;

    const generationInput = [
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf",
        },
      },
      userPrompt,
    ];

    const result = await generativeModel.generateContent(generationInput);
    let generatedText = result?.response?.text?.() ?? "";

    const jsonRegex = /```json([\s\S]*?)```/;
    const match = generatedText.match(jsonRegex);
    let structuredData = {};
    if (match && match[1]) {
      try {
        structuredData = JSON.parse(match[1].trim());
      } catch (err) {
        console.error("Error parsing JSON from AI response:", err);
      }
    } else {
      console.warn("No code block with JSON found in AI response.");
    }

    res.json({
      message: "Merged PDF created and summarized successfully!",
      uniqueId,
      mergedPdf: mergedFilename,
      data: structuredData,
    });
  } catch (error) {
    console.error("Error merging/summarizing PDFs:", error);
    res.status(500).json({
      error: "Could not merge or summarize PDFs.",
    });
  }
});

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.get("/learn", (req, res) => {
  res.render("learn");
});

app.post("/calculateTax", async (req, res) => {
  let user_data = req.body;

  try {
    const userPrompt = `
  You are a tax analysis assistant. The user has provided his complete details
  They want to calculate best taxLiability and effectiveTaxRate comparison between old and new tax regime in India. You need to calculate both values in both regimes and give the best one. 

  user data - ${user_data}

  You must return your analysis as a valid JSON object in a code block that starts with \`\`\`json and ends with \`\`\`. 
  No additional text outside that code block. 

  Required JSON structure example:
  {
    "taxLiability" : "calculated tax liability",
    "effectiveTaxRate" : "Effective tax Rate"
  }

     produce the JSON above.
  `;

    const generationInput = [userPrompt];

    const result = await generativeModel.generateContent(generationInput);
    let generatedText = result?.response?.text?.() ?? "";

    const jsonRegex = /```json([\s\S]*?)```/;
    const match = generatedText.match(jsonRegex);
    let structuredData = {};
    if (match && match[1]) {
      try {
        structuredData = JSON.parse(match[1].trim());
      } catch (err) {
        console.error("Error parsing JSON from AI response:", err);
      }
    } else {
      console.warn("No code block with JSON found in AI response.");
    }

    res.json({
      message: "Calculated Tax",
      data: structuredData,
    });
  } catch (error) {
    console.error("Error Calculating Tax", error);
    res.status(500).json({
      error: "Could Not Calculate",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
