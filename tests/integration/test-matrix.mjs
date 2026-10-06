// Test matrix runner for Phase 7 Recommendations Engine

const BASE_URL = 'http://localhost:5000/api';

const tests = [
  {
    name: 'TEST 1: History + Architecture (4 hours, ₹1000)',
    payload: {
      userLat: 17.3850,
      userLon: 78.4867,
      preferences: {
        interests: ['history', 'architecture'],
        availableTime: 'half_day', // 4 hours
        budgetAmount: 1000,
        travelStyle: 'solo',
        pacePreference: 'moderate',
        maxDistanceKm: null,
        minRating: null,
        openNowOnly: false
      }
    }
  },
  {
    name: 'TEST 2: Nature + Food (2 hours, ₹500)',
    payload: {
      userLat: 17.3850,
      userLon: 78.4867,
      preferences: {
        interests: ['nature', 'food'],
        availableTime: 'short', // 2 hours
        budgetAmount: 500,
        travelStyle: 'solo',
        pacePreference: 'packed',
        maxDistanceKm: null,
        minRating: null,
        openNowOnly: false
      }
    }
  },
  {
    name: 'TEST 3: Food (Full Day, ₹2000)',
    payload: {
      userLat: 17.3850,
      userLon: 78.4867,
      preferences: {
        interests: ['food'],
        availableTime: 'full_day',
        budgetAmount: 2000,
        travelStyle: 'friends',
        pacePreference: 'relaxed',
        maxDistanceKm: null,
        minRating: null,
        openNowOnly: false
      }
    }
  },
  {
    name: 'TEST 4: Any category (< 5 km)',
    payload: {
      userLat: 17.3850,
      userLon: 78.4867,
      preferences: {
        interests: ['history', 'architecture', 'nature', 'food'],
        availableTime: 'half_day',
        budgetAmount: 1500,
        travelStyle: 'solo',
        pacePreference: 'moderate',
        maxDistanceKm: 5,
        minRating: null,
        openNowOnly: false
      }
    }
  },
  {
    name: 'TEST 5: Any category (Rating 4.7+)',
    payload: {
      userLat: 17.3850,
      userLon: 78.4867,
      preferences: {
        interests: ['history', 'architecture', 'nature', 'food'],
        availableTime: 'half_day',
        budgetAmount: 1500,
        travelStyle: 'solo',
        pacePreference: 'moderate',
        maxDistanceKm: null,
        minRating: 4.7,
        openNowOnly: false
      }
    }
  },
  {
    name: 'TEST 6: Open Now Only',
    payload: {
      userLat: 17.3850,
      userLon: 78.4867,
      preferences: {
        interests: ['history', 'architecture', 'nature', 'food'],
        availableTime: 'half_day',
        budgetAmount: 1500,
        travelStyle: 'solo',
        pacePreference: 'moderate',
        maxDistanceKm: null,
        minRating: null,
        openNowOnly: true
      }
    }
  }
];

async function run() {
  console.log('====================================================');
  console.log('PHASE 7 RECOMMENDATION ENGINE TEST MATRIX');
  console.log('====================================================\n');

  for (const t of tests) {
    console.log(`>>> ${t.name}`);
    try {
      const res = await fetch(`${BASE_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t.payload)
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed:', data.message);
        continue;
      }

      console.log(`Applied Filters: maxDist=${t.payload.preferences.maxDistanceKm ?? 'Any'}, minRating=${t.payload.preferences.minRating ?? 'Any'}, openNow=${t.payload.preferences.openNowOnly}`);
      console.log(`Total Candidates Evaluated: ${data.totalCandidates}, Returned: ${data.count}`);
      console.log('Top 5 Places:');
      
      const top5 = data.places.slice(0, 5);
      top5.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name} (${p.category})`);
        console.log(`     Match Score: ${p.matchScore}% | Rating: ${p.rating} | Dist: ${p.distanceKm} km | EstCost: ₹${p.estimatedCost ?? 'Free'} | Open: ${p.isOpenNow ? 'Yes' : 'No'}`);
        console.log(`     Why Matched: ${p.matchReasons?.join('; ') || 'N/A'}`);
        if (p.scoreBreakdown) {
          console.log(`     Breakdown: Interest=${p.scoreBreakdown.interestMatch} | Dist=${p.scoreBreakdown.distanceProximity} | Rating=${p.scoreBreakdown.ratingQuality} | Time=${p.scoreBreakdown.timeFit} | Budget=${p.scoreBreakdown.budgetFit} | Open=${p.scoreBreakdown.openStatus} | StyleBonus=${p.scoreBreakdown.travelStyleBonus}`);
        }
      });
      console.log('----------------------------------------------------\n');
    } catch (err) {
      console.error('Error running test:', err.message);
    }
  }
}

run();
