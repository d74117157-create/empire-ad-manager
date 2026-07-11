const express = require('express');
const app = express();
app.use(express.json());

// ==================== CAMPAIGN MANAGEMENT ====================
const campaigns = new Map();
let campaignId = 1;

app.post('/api/campaigns/create', (req, res) => {
  const { name, platform, budget, targetAudience, creatives, landingPage } = req.body;

  const campaign = {
    id: campaignId++,
    name,
    platform: platform || 'google', // google, facebook, tiktok, youtube
    status: 'draft',
    budget: {
      daily: budget.daily || 50,
      total: budget.total || 1000,
      spent: 0
    },
    targetAudience: {
      age: targetAudience.age || [25, 65],
      gender: targetAudience.gender || 'all',
      interests: targetAudience.interests || [],
      locations: targetAudience.locations || ['US'],
      devices: targetAudience.devices || ['desktop', 'mobile']
    },
    creatives: creatives.map(c => ({
      id: Math.random().toString(36).substr(2, 9),
      type: c.type, // image, video, carousel, text
      headline: c.headline,
      description: c.description,
      cta: c.cta || 'Learn More',
      imageUrl: c.imageUrl,
      performance: { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    })),
    landingPage,
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: 0
    },
    createdAt: new Date().toISOString()
  };

  campaigns.set(campaign.id, campaign);

  res.json({
    success: true,
    campaign,
    estimated: {
      dailyReach: Math.floor(campaign.budget.daily * 20),
      estimatedClicks: Math.floor(campaign.budget.daily * 20 * 0.03),
      estimatedCpa: (campaign.budget.daily / Math.floor(campaign.budget.daily * 20 * 0.03 * 0.1)).toFixed(2)
    }
  });
});

app.get('/api/campaigns', (req, res) => {
  const all = Array.from(campaigns.values());
  res.json({
    total: all.length,
    active: all.filter(c => c.status === 'active').length,
    campaigns: all
  });
});

app.post('/api/campaigns/:id/launch', (req, res) => {
  const campaign = campaigns.get(parseInt(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  campaign.status = 'active';
  campaign.launchedAt = new Date().toISOString();

  res.json({ success: true, campaign });
});

app.post('/api/campaigns/:id/pause', (req, res) => {
  const campaign = campaigns.get(parseInt(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  campaign.status = 'paused';
  res.json({ success: true, campaign });
});

// ==================== A/B TESTING ====================
app.post('/api/campaigns/:id/ab-test', (req, res) => {
  const campaign = campaigns.get(parseInt(req.params.id));
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const { variantA, variantB, metric } = req.body;

  // Simulate A/B test results
  const results = {
    variantA: {
      ...variantA,
      impressions: Math.floor(Math.random() * 50000) + 10000,
      clicks: Math.floor(Math.random() * 2000) + 500,
      conversions: Math.floor(Math.random() * 200) + 50,
      ctr: 0,
      cpa: 0
    },
    variantB: {
      ...variantB,
      impressions: Math.floor(Math.random() * 50000) + 10000,
      clicks: Math.floor(Math.random() * 2000) + 500,
      conversions: Math.floor(Math.random() * 200) + 50,
      ctr: 0,
      cpa: 0
    }
  };

  results.variantA.ctr = (results.variantA.clicks / results.variantA.impressions * 100).toFixed(2);
  results.variantB.ctr = (results.variantB.clicks / results.variantB.impressions * 100).toFixed(2);
  results.variantA.cpa = (results.variantA.spend / results.variantA.conversions).toFixed(2);
  results.variantB.cpa = (results.variantB.spend / results.variantB.conversions).toFixed(2);

  const winner = results.variantA.ctr > results.variantB.ctr ? 'A' : 'B';

  res.json({
    winner,
    results,
    recommendation: `Use Variant ${winner} — ${(Math.abs(results.variantA.ctr - results.variantB.ctr)).toFixed(2)}% higher CTR`
  });
});

// ==================== AD COPY GENERATOR ====================
app.post('/api/generate-ad-copy', (req, res) => {
  const { product, audience, platform, tone } = req.body;

  const templates = {
    google: [
      { headline: `Best ${product} — Free Shipping`, description: `Top-rated ${product}. 50,000+ happy customers. 30-day returns.`, cta: 'Shop Now' },
      { headline: `${product} — Up to 70% Off`, description: `Limited time offer on premium ${product}. Don't miss out!`, cta: 'Buy Now' },
      { headline: `${product} Reviews 2024`, description: `See why 10,000+ people chose our ${product}. Rated #1.`, cta: 'Read Reviews' }
    ],
    facebook: [
      { headline: `I was skeptical about ${product} until...`, description: `This changed everything. See the results for yourself.`, cta: 'Learn More' },
      { headline: `Stop wasting money on bad ${product}`, description: `We found the best one. Here's why 50K people agree.`, cta: 'See Why' },
      { headline: `${product} that actually works`, description: `No gimmicks. Just results. 30-day guarantee.`, cta: 'Try Now' }
    ],
    tiktok: [
      { headline: `POV: You finally found the best ${product}`, description: `This is the one everyone is talking about 🔥`, cta: 'Get Yours' },
      { headline: `I tested 10 ${product}s so you don't have to`, description: `This is the winner. Link in bio.`, cta: 'Shop Now' }
    ]
  };

  const platformTemplates = templates[platform] || templates.google;

  res.json({
    platform,
    copies: platformTemplates.map((t, i) => ({
      id: i + 1,
      ...t,
      estimatedCtr: (Math.random() * 5 + 1).toFixed(2) + '%',
      estimatedCpc: '$' + (Math.random() * 2 + 0.5).toFixed(2)
    }))
  });
});

// ==================== BUDGET OPTIMIZER ====================
app.post('/api/optimize-budget', (req, res) => {
  const { campaigns: campaignData, totalBudget } = req.body;

  // Calculate ROAS for each campaign and redistribute
  const optimized = campaignData.map(c => {
    const roas = c.revenue / c.spend;
    return {
      ...c,
      roas: roas.toFixed(2),
      recommendedBudget: Math.floor(totalBudget * (roas / campaignData.reduce((a, b) => a + (b.revenue / b.spend), 0)))
    };
  }).sort((a, b) => b.roas - a.roas);

  res.json({
    totalBudget,
    optimizedAllocation: optimized,
    recommendation: `Increase budget for ${optimized[0].name} (ROAS: ${optimized[0].roas}x). Pause ${optimized[optimized.length - 1].name}.`
  });
});

// ==================== RETARGETING SETUP ====================
app.post('/api/retargeting/create', (req, res) => {
  const { sourceCampaign, audienceType, discount } = req.body;

  const audiences = {
    cart_abandoners: { name: 'Cart Abandoners', description: 'Users who added to cart but didn\'t checkout', estimatedSize: 5000 },
    page_viewers: { name: 'Page Viewers', description: 'Users who viewed product but didn\'t add to cart', estimatedSize: 15000 },
    past_customers: { name: 'Past Customers', description: 'Previous buyers — upsell opportunity', estimatedSize: 3000 },
    video_watchers: { name: 'Video Watchers', description: 'Watched 50%+ of video ad', estimatedSize: 8000 }
  };

  const audience = audiences[audienceType] || audiences.page_viewers;

  res.json({
    retargetingCampaign: {
      name: `Retargeting: ${audience.name}`,
      sourceCampaign,
      audience,
      discount: discount || '10%',
      adCopy: {
        headline: `Still thinking about it?`,
        description: `Get ${discount || '10%'} off your order. Limited time only.`,
        cta: 'Claim Discount'
      },
      estimatedConversionLift: '25-40%'
    }
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`📢 Ad Campaign Manager on port ${PORT}`));
