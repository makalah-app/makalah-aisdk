/**
 * Quick P08 Persona Architecture Validation Runner
 * Executes only P08 test suites for rapid persona system validation
 */

import P08ComprehensiveTestRunner from './p08-comprehensive-persona-test-suite';

console.log('🎭 Starting P08 Persona Architecture Validation...');
console.log('This will run all 5 P08 test suites to validate persona system');
console.log('Expected duration: 30-40 minutes');
console.log('');

const runner = new P08ComprehensiveTestRunner();
runner.runComprehensiveValidation().catch(error => {
  console.error('💥 P08 Validation failed:', error);
  process.exit(1);
});