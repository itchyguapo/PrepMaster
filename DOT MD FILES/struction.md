{
  "fix_name": "permanent_exam_subject_id_alignment",
  "confidence_level": 0.97,
  "problem_summary": {
    "issue": "Insert failures due to NOT NULL subject_id in exams table",
    "root_cause": "Schema drift between PostgreSQL, Drizzle schema, and exam creation logic",
    "error_signature": "null value in column 'subject_id' violates not-null constraint"
  },
  "authoritative_decision": {
    "data_model_rule": "Every exam MUST belong to exactly one subject",
    "optional_subject_id": false,
    "fallback_subject_id": false
  },
  "required_schema_state": {
    "table": "exams",
    "columns": {
      "subject_id": {
        "type": "uuid",
        "nullable": false,
        "foreign_key": "subjects.id",
        "on_delete": "restrict"
      }
    }
  },
  "drizzle_schema_changes": [
    {
      "file": "schema/exams.ts",
      "action": "enforce_not_null",
      "definition": "subjectId: uuid(\"subject_id\").notNull().references(() => subjects.id, { onDelete: \"restrict\" })"
    }
  ],
  "database_migration_steps": [
    {
      "step": 1,
      "action": "validate_existing_data",
      "sql": "SELECT id FROM exams WHERE subject_id IS NULL;"
    },
    {
      "step": 2,
      "action": "resolve_invalid_rows",
      "rule": "Backfill subject_id OR delete rows before proceeding"
    },
    {
      "step": 3,
      "action": "apply_schema",
      "command": "npx drizzle-kit generate && npx drizzle-kit push"
    }
  ],
  "application_logic_requirements": {
    "exam_creation": {
      "mandatory_fields": ["subjectId"],
      "resolution_priority": [
        "subjectId from first question",
        "subjectId resolved from category",
        "hard fail if unresolved"
      ],
      "failure_mode": "throw_error"
    }
  },
  "code_enforcement_rules": [
    {
      "location": "safeInsertExam",
      "rule": "Reject inserts missing subjectId",
      "error_message": "subjectId is required for exam creation"
    }
  ],
  "mapping_requirements": {
    "camel_to_snake": {
      "subjectId": "subject_id"
    }
  ],
  "disallowed_patterns": [
    "nullable subjectId",
    "default subjectId fallbacks",
    "silent insert retries",
    "schema-only fixes without logic enforcement"
  ],
  "post_fix_verification": [
    {
      "check": "Schema alignment",
      "method": "Drizzle introspection matches PostgreSQL"
    },
    {
      "check": "Runtime safety",
      "method": "Attempt exam creation without subjectId must fail"
    }
  ],
  "long_term_guardrails": {
    "schema_drift_prevention": true,
    "insert_contract_validation": true,
    "migration_prompt_auto_accept": false
  },
  "expected_outcome": {
    "runtime_insert_errors": "eliminated",
    "schema_consistency": "guaranteed",
    "future_regression_risk": "near_zero"
  }
}
