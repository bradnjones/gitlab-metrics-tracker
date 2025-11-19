#!/usr/bin/env node

/**
 * Test Incident Timeline Events
 * Fetches incidents and their timeline events to verify GitLab API structure
 *
 * Usage:
 *   node test-incident-timeline-events.js
 *
 * This script will:
 * 1. Fetch recent iterations
 * 2. Fetch incidents for the most recent iteration
 * 3. Fetch timeline events for each incident
 * 4. Display timeline event structure and tags
 */

import 'dotenv/config';
import { GraphQLClient } from 'graphql-request';

/**
 * Fetch incidents for a date range
 */
async function fetchIncidents(client, projectPath, startDate, endDate) {
  const query = `
    query getIncidents($fullPath: ID!, $after: String, $createdAfter: Time, $createdBefore: Time) {
      group(fullPath: $fullPath) {
        id
        issues(
          types: [INCIDENT]
          includeSubgroups: true
          createdAfter: $createdAfter
          createdBefore: $createdBefore
          first: 10
          after: $after
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            iid
            title
            state
            createdAt
            closedAt
            webUrl
          }
        }
      }
    }
  `;

  try {
    // Fetch incidents from broader date range (60 days before iteration start)
    const iterationStart = new Date(startDate);
    const iterationEnd = new Date(endDate);
    const fetchStart = new Date(iterationStart);
    fetchStart.setDate(fetchStart.getDate() - 60);

    const data = await client.request(query, {
      fullPath: projectPath,
      createdAfter: fetchStart.toISOString(),
      createdBefore: iterationEnd.toISOString(),
    });

    if (!data.group || !data.group.issues) {
      return [];
    }

    return data.group.issues.nodes;
  } catch (error) {
    console.error('Error fetching incidents:', error.message);
    throw error;
  }
}

/**
 * Extract project path from incident webUrl
 * Example: https://gitlab.com/smi-org/dev/member_app/-/issues/14
 *          -> smi-org/dev/member_app
 */
function extractProjectPath(webUrl) {
  try {
    const url = new URL(webUrl);
    const pathParts = url.pathname.split('/-/')[0]; // Get everything before /-/
    return pathParts.substring(1); // Remove leading /
  } catch (error) {
    console.error('Error extracting project path from URL:', webUrl);
    return null;
  }
}

/**
 * Fetch timeline events for a specific incident
 */
async function fetchIncidentTimelineEvents(client, incident) {
  // Extract project path from incident's webUrl
  const projectPath = extractProjectPath(incident.webUrl);

  if (!projectPath) {
    console.error(`  ⚠️  Could not extract project path from: ${incident.webUrl}`);
    return [];
  }

  const query = `
    query getIncidentTimelineEvents($fullPath: ID!, $incidentId: IssueID!) {
      project(fullPath: $fullPath) {
        incidentManagementTimelineEvents(incidentId: $incidentId) {
          nodes {
            id
            occurredAt
            createdAt
            note
            noteHtml
            editable
            action
            timelineEventTags {
              nodes {
                name
              }
            }
            author {
              username
              name
            }
          }
        }
      }
    }
  `;

  try {
    const data = await client.request(query, {
      fullPath: projectPath,
      incidentId: incident.id,
    });

    if (!data.project || !data.project.incidentManagementTimelineEvents) {
      return [];
    }

    return data.project.incidentManagementTimelineEvents.nodes;
  } catch (error) {
    console.error(`  ⚠️  Error fetching timeline events: ${error.message}`);
    if (error.response?.errors) {
      error.response.errors.forEach(err => {
        console.error(`     → ${err.message}`);
      });
    }
    // Return empty array instead of throwing - timeline events might not be available
    return [];
  }
}

/**
 * Fetch recent iterations
 */
async function fetchIterations(client, projectPath) {
  const query = `
    query getIterations($fullPath: ID!, $after: String) {
      group(fullPath: $fullPath) {
        id
        iterations(first: 10, after: $after) {
          nodes {
            id
            title
            startDate
            dueDate
            state
          }
        }
      }
    }
  `;

  try {
    const data = await client.request(query, {
      fullPath: projectPath,
    });

    if (!data.group || !data.group.iterations) {
      return [];
    }

    return data.group.iterations.nodes;
  } catch (error) {
    console.error('Error fetching iterations:', error.message);
    throw error;
  }
}

/**
 * Display timeline event in formatted way
 */
function displayTimelineEvent(event, index) {
  console.log(`\n  Event #${index + 1}:`);
  console.log(`    occurredAt:  ${event.occurredAt}`);
  console.log(`    createdAt:   ${event.createdAt}`);

  // Display tags
  if (event.timelineEventTags && event.timelineEventTags.nodes.length > 0) {
    const tags = event.timelineEventTags.nodes.map(tag => tag.name).join(', ');
    console.log(`    tags:        [${tags}]`);
  } else {
    console.log(`    tags:        (none)`);
  }

  // Display note (truncated if long)
  const note = event.note || '(no note)';
  const truncatedNote = note.length > 80 ? note.substring(0, 77) + '...' : note;
  console.log(`    note:        ${truncatedNote}`);

  if (event.author) {
    console.log(`    author:      ${event.author.name} (@${event.author.username})`);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('========================================');
  console.log('INCIDENT TIMELINE EVENTS TEST');
  console.log('========================================\n');

  // Validate environment variables
  if (!process.env.GITLAB_TOKEN) {
    console.error('ERROR: GITLAB_TOKEN not found in .env file');
    process.exit(1);
  }

  if (!process.env.GITLAB_PROJECT_PATH) {
    console.error('ERROR: GITLAB_PROJECT_PATH not found in .env file');
    process.exit(1);
  }

  const gitlabUrl = process.env.GITLAB_URL || 'https://gitlab.com';
  const projectPath = process.env.GITLAB_PROJECT_PATH;

  console.log(`GitLab URL: ${gitlabUrl}`);
  console.log(`Project Path: ${projectPath}\n`);

  // Create GraphQL client
  const client = new GraphQLClient(`${gitlabUrl}/api/graphql`, {
    headers: {
      Authorization: `Bearer ${process.env.GITLAB_TOKEN}`
    }
  });

  try {
    // Step 1: Fetch recent iterations
    console.log('Step 1: Fetching recent iterations...');
    const iterations = await fetchIterations(client, projectPath);

    if (iterations.length === 0) {
      console.error('ERROR: No iterations found. Check your GITLAB_PROJECT_PATH');
      process.exit(1);
    }

    console.log(`✓ Found ${iterations.length} iterations\n`);

    // Use the most recent closed iteration
    const recentIteration = iterations.find(it => it.state === 'closed') || iterations[0];
    console.log(`Using iteration: ${recentIteration.title}`);
    console.log(`  Start: ${recentIteration.startDate}`);
    console.log(`  End:   ${recentIteration.dueDate}`);
    console.log();

    // Step 2: Fetch incidents for this iteration
    console.log('Step 2: Fetching incidents...');
    const incidents = await fetchIncidents(
      client,
      projectPath,
      recentIteration.startDate,
      recentIteration.dueDate
    );

    if (incidents.length === 0) {
      console.log('✓ No incidents found in this iteration');
      console.log('\nTIP: Try creating a test incident in GitLab:');
      console.log('  1. Create a new issue');
      console.log('  2. Change issue type to "Incident"');
      console.log('  3. Add timeline events with "Start time" and "End time" tags');
      console.log('  4. Run this script again');
      process.exit(0);
    }

    console.log(`✓ Found ${incidents.length} incident(s)\n`);

    // Step 3: Fetch timeline events for each incident
    console.log('Step 3: Fetching timeline events for each incident...\n');
    console.log('========================================');

    for (let i = 0; i < incidents.length; i++) {
      const incident = incidents[i];
      console.log(`\nIncident #${incident.iid}: ${incident.title}`);
      console.log(`  State: ${incident.state}`);
      console.log(`  Created: ${incident.createdAt}`);
      console.log(`  Closed:  ${incident.closedAt || 'Still open'}`);
      console.log(`  URL: ${incident.webUrl}`);

      // Fetch timeline events (passing entire incident object to extract project path)
      const timelineEvents = await fetchIncidentTimelineEvents(client, incident);

      if (timelineEvents.length === 0) {
        console.log('\n  ⚠️  No timeline events found for this incident');
        console.log('  TIP: Add timeline events in GitLab UI:');
        console.log(`       ${incident.webUrl}`);
        console.log('       Click "Add timeline event" and tag with "Start time" or "End time"');
      } else {
        console.log(`\n  ✓ Found ${timelineEvents.length} timeline event(s):`);

        // Display each timeline event
        timelineEvents.forEach((event, idx) => {
          displayTimelineEvent(event, idx);
        });

        // Check for Start time and End time tags
        const hasStartTime = timelineEvents.some(e =>
          e.timelineEventTags?.nodes.some(tag =>
            tag.name.toLowerCase().includes('start')
          )
        );
        const hasEndTime = timelineEvents.some(e =>
          e.timelineEventTags?.nodes.some(tag =>
            tag.name.toLowerCase().includes('end')
          )
        );

        console.log('\n  Analysis:');
        console.log(`    Has "Start time" tag: ${hasStartTime ? '✓ YES' : '✗ NO'}`);
        console.log(`    Has "End time" tag:   ${hasEndTime ? '✓ YES' : '✗ NO'}`);

        if (hasStartTime && hasEndTime) {
          console.log(`    → This incident has proper timing tags for accurate MTTR! 🎉`);
        } else if (hasStartTime || hasEndTime) {
          console.log(`    → Partial timing tags - add missing tag for accurate MTTR`);
        } else {
          console.log(`    → No timing tags - will fall back to createdAt/closedAt`);
        }
      }

      console.log('\n' + '─'.repeat(60));
    }

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`  Incidents found: ${incidents.length}`);
    console.log(`\nNext Steps:`);
    console.log(`  1. If timeline events exist, proceed with implementation`);
    console.log(`  2. If no timeline events, create test incident with timeline events`);
    console.log(`  3. Verify "Start time" and "End time" tags are available in your GitLab instance`);

  } catch (error) {
    console.error('\nERROR:', error.message);
    if (error.response?.errors) {
      console.error('GraphQL Errors:', error.response.errors);
    }
    process.exit(1);
  }
}

// Run the test
main();
