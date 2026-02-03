export const FIXTURES = {
  lowSlop: {
    text: `The quarterly report indicates a 15% increase in customer acquisition
           compared to the previous period. Revenue grew by $2.3 million, driven
           primarily by expansion in the European market. Operating costs remained
           stable, with a slight decrease in marketing spend offset by increased
           investment in customer support infrastructure.`,
    expectedRange: [0, 20],
  },
  
  highSlop: {
    text: `Let's delve into this vibrant tapestry of innovation that's not just
           transforming but revolutionizing the industry landscape. This paradigm
           shift represents a synergy between cutting-edge technology and human
           ingenuity. It's important to note that these groundbreaking developments
           are not merely incremental but truly transformative.`,
    expectedRange: [50, 100],
  },
  
  patternHeavy: {
    text: `This solution is not just a product but a platform. It's not only
           innovative but revolutionary. The approach is not merely useful but
           essential. We're not simply improving but reimagining the entire
           experience.`,
    expectedRange: [15, 80],
  },
  
  trigramHeavy: {
    text: `It's important to note that in order to achieve success, we need to
           carefully consider all factors. It is worth mentioning that this
           approach allows us to effectively address the challenges at hand.`,
    expectedRange: [30, 60],
  },
  
  edgeCases: {
    empty: "",
    tooShort: "Hello world.",
    exactlyMinWords: "word ".repeat(20).trim(),
    exactlyMaxWords: "word ".repeat(7500).trim(),
    htmlContent: "<p><strong>Bold</strong> and <em>italic</em> text here.</p>".repeat(10),
    markdownContent: "# Heading\n\n**Bold** text with [link](url)\n\n".repeat(10),
    emojiOnly: "🚀💯🔥✨🎉".repeat(50),
    codeBlock: "```javascript\nconst x = 1;\nfunction test() { return x; }\n```".repeat(5),
    mixedLanguage: "This is English. これは日本語です. This is more English.",
  },
};
