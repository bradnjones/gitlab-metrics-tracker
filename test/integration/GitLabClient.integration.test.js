import { describe, it, expect, beforeAll } from '@jest/globals';
import { GitLabClient } from '../../src/lib/infrastructure/api/GitLabClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if required environment variables are set
const hasRequiredEnv = process.env.GITLAB_TOKEN && process.env.GITLAB_PROJECT_PATH;

// Skip all integration tests if environment variables are not configured
const describeIntegration = hasRequiredEnv ? describe : describe.skip;

describeIntegration('GitLabClient Integration Tests', () => {
  let client;

  beforeAll(() => {
    // Create client with real credentials from .env
    client = new GitLabClient({
      url: process.env.GITLAB_URL || 'https://gitlab.com',
      token: process.env.GITLAB_TOKEN,
      projectPath: process.env.GITLAB_PROJECT_PATH
    });

    console.log('\n🔗 Running integration tests against real GitLab API');
    console.log(`   URL: ${client.url}`);
    console.log(`   Project: ${client.projectPath}`);
  });

  describe('fetchProject', () => {
    it('should fetch real project metadata', async () => {
      // Get a real project from the group first
      const projects = await client.fetchGroupProjects();

      if (projects.length === 0) {
        console.log(`   ⚠ Skipping - no projects available in group`);
        return;
      }

      const projectPath = projects[0].fullPath;
      console.log(`   Testing with project: ${projectPath}`);

      // Create a temporary client for the specific project
      const projectClient = new GitLabClient({
        url: process.env.GITLAB_URL || 'https://gitlab.com',
        token: process.env.GITLAB_TOKEN,
        projectPath: projectPath
      });

      const project = await projectClient.fetchProject();

      // Verify structure
      expect(project).toBeDefined();
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('nameWithNamespace');
      expect(project).toHaveProperty('webUrl');
      expect(project).toHaveProperty('description');

      console.log(`   ✓ Fetched project: ${project.name}`);
      console.log(`   ✓ Full name: ${project.nameWithNamespace}`);
    }, 60000); // 60 second timeout (includes fetching projects list)
  });

  describe('fetchIterations', () => {
    it('should fetch real iterations from group', async () => {
      const iterations = await client.fetchIterations();

      // Verify structure
      expect(Array.isArray(iterations)).toBe(true);

      if (iterations.length > 0) {
        const firstIteration = iterations[0];
        expect(firstIteration).toHaveProperty('id');
        expect(firstIteration).toHaveProperty('title');
        expect(firstIteration).toHaveProperty('state');
        expect(firstIteration).toHaveProperty('startDate');
        expect(firstIteration).toHaveProperty('dueDate');

        console.log(`   ✓ Fetched ${iterations.length} iterations`);
        console.log(`   ✓ Sample iteration: ${firstIteration.title}`);
      } else {
        console.log(`   ⚠ No iterations found (group may not have iterations configured)`);
      }
    }, 30000);
  });

  describe('fetchGroupProjects', () => {
    it('should fetch real projects from group with caching', async () => {
      // First call - cache miss
      const projects1 = await client.fetchGroupProjects();

      expect(Array.isArray(projects1)).toBe(true);
      expect(projects1.length).toBeGreaterThan(0);

      const firstProject = projects1[0];
      expect(firstProject).toHaveProperty('id');
      expect(firstProject).toHaveProperty('fullPath');
      expect(firstProject).toHaveProperty('name');

      console.log(`   ✓ Fetched ${projects1.length} projects from group`);

      // Second call - cache hit
      const projects2 = await client.fetchGroupProjects();

      expect(projects2).toEqual(projects1);
      console.log(`   ✓ Cache working - returned same ${projects2.length} projects`);
    }, 60000); // 60 second timeout for potentially large groups
  });

  describe('fetchIterationDetails', () => {
    it('should fetch real issues for an iteration', async () => {
      // First get an iteration
      const iterations = await client.fetchIterations();

      if (iterations.length === 0) {
        console.log(`   ⚠ Skipping - no iterations available`);
        return;
      }

      const iterationId = iterations[0].id;
      const iterationTitle = iterations[0].title;

      // Fetch details
      const details = await client.fetchIterationDetails(iterationId);

      expect(details).toHaveProperty('issues');
      expect(details).toHaveProperty('mergeRequests');
      expect(Array.isArray(details.issues)).toBe(true);

      if (details.issues.length > 0) {
        const firstIssue = details.issues[0];
        expect(firstIssue).toHaveProperty('id');
        expect(firstIssue).toHaveProperty('title');
        expect(firstIssue).toHaveProperty('state');

        console.log(`   ✓ Fetched ${details.issues.length} issues for "${iterationTitle}"`);
      } else {
        console.log(`   ✓ Iteration "${iterationTitle}" has no issues`);
      }
    }, 30000);
  });

  describe('fetchMergeRequestsForGroup', () => {
    it('should fetch real merged MRs within date range', async () => {
      // Fetch MRs from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const mrs = await client.fetchMergeRequestsForGroup(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(Array.isArray(mrs)).toBe(true);

      if (mrs.length > 0) {
        const firstMR = mrs[0];
        expect(firstMR).toHaveProperty('id');
        expect(firstMR).toHaveProperty('title');
        expect(firstMR).toHaveProperty('state');
        expect(firstMR.state).toBe('merged');
        expect(firstMR).toHaveProperty('mergedAt');
        expect(firstMR).toHaveProperty('project');

        console.log(`   ✓ Fetched ${mrs.length} merged MRs from last 30 days`);
        console.log(`   ✓ Sample MR: ${firstMR.title}`);
      } else {
        console.log(`   ⚠ No merged MRs found in last 30 days`);
      }
    }, 60000);
  });

  describe('fetchPipelinesForProject', () => {
    it('should fetch real pipelines for a project', async () => {
      // Get first project from group
      const projects = await client.fetchGroupProjects();

      if (projects.length === 0) {
        console.log(`   ⚠ Skipping - no projects available`);
        return;
      }

      const projectPath = projects[0].fullPath;
      const projectName = projects[0].name;

      // Fetch pipelines from last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const pipelines = await client.fetchPipelinesForProject(
        projectPath,
        'main', // Try main branch
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(Array.isArray(pipelines)).toBe(true);

      if (pipelines.length > 0) {
        const firstPipeline = pipelines[0];
        expect(firstPipeline).toHaveProperty('id');
        expect(firstPipeline).toHaveProperty('status');
        expect(firstPipeline).toHaveProperty('ref');
        expect(firstPipeline).toHaveProperty('createdAt');

        console.log(`   ✓ Fetched ${pipelines.length} pipelines for "${projectName}"`);
        console.log(`   ✓ Sample pipeline: ${firstPipeline.status} on ${firstPipeline.ref}`);
      } else {
        console.log(`   ⚠ No pipelines found for "${projectName}" in last 7 days`);
      }
    }, 60000);
  });
});

// Print helpful message if tests are skipped
if (!hasRequiredEnv) {
  console.log('\n⚠️  Integration tests skipped - GitLab credentials not configured');
  console.log('\nTo run integration tests:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Set GITLAB_TOKEN and GITLAB_PROJECT_PATH');
  console.log('3. Run: npm test -- test/integration/\n');
}
