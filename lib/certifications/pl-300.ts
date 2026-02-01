import { Certification } from "@/types/certification"

// ID scheme: pd-### (prepare-data), md-### (model-data), va-### (visualize-analyze), dm-### (deploy-maintain)
// Tags: lowercase kebab-case, 2-4 per question for filtering and analytics.
export const pl300: Certification = {
  slug: "pl-300",
  name: "Microsoft Power BI Data Analyst",
  shortName: "PL-300",
  description:
    "Prepare for the Microsoft Power BI Data Analyst certification. Master data preparation, modeling, visualization, and analysis using Power BI.",
  provider: "Microsoft",
  passingScore: 700,
  officialUrl: "https://learn.microsoft.com/en-us/certifications/exams/pl-300/",
  totalQuestions: 0, // Will be calculated
  icon: "",
  topics: [
    {
      id: "prepare-data",
      title: "Prepare the Data",
      description:
        "Get data from different data sources, profile the data, and clean, transform, and load the data.",
      estimatedTime: "30 minutes",
      questions: [
        {
          id: "pd-001",
          type: "multiple-choice",
          question: "In Power Query, what does full query folding mean?",
          options: [
            "All transformations are pushed to the data source; the Power Query engine does minimal work.",
            "Only the Source step runs at the data source; all other steps run locally.",
            "Power Query caches results and never queries the source again.",
            "Transformations run after data is loaded into the model."
          ],
          correctAnswer: 0,
          explanation:
            "Full query folding means all transformations are translated and executed at the source, with minimal processing in the Power Query engine.",
          difficulty: "medium",
          tags: ["power-query", "query-folding", "performance"]
        },
        {
          id: "pd-002",
          type: "multiple-choice",
          question: "Which situation most likely results in no query folding?",
          options: [
            "Using a transformation the connector cannot translate to the source query language.",
            "Filtering rows early in the query.",
            "Removing unused columns before other steps.",
            "Using a structured source like SQL Server."
          ],
          correctAnswer: 0,
          explanation:
            "If a transformation or connector cannot be translated to the source query language, Power Query evaluates the steps in its own engine (no folding).",
          difficulty: "medium",
          tags: ["power-query", "query-folding", "performance"]
        },
        {
          id: "pd-003",
          type: "multiple-choice",
          question: "What happens when a data source is set to the Private privacy level?",
          options: [
            "Data from that source can't be combined with other sources, including other Private sources.",
            "Data can be freely combined with Public sources.",
            "Query folding is forced for all steps.",
            "Credentials are ignored for that source."
          ],
          correctAnswer: 0,
          explanation:
            "Private sources are isolated so data from them can't be combined with other sources, even other Private sources.",
          difficulty: "medium",
          tags: ["power-query", "privacy-levels", "security"]
        },
        {
          id: "pd-004",
          type: "multiple-choice",
          question: "In Column quality, which status indicates that errors exist and the quality of remaining values is unknown?",
          options: ["Valid", "Error", "Empty", "Unknown"],
          correctAnswer: 3,
          explanation:
            "Unknown appears when errors exist and the quality of the remaining values can't be determined.",
          difficulty: "easy",
          tags: ["power-query", "data-profiling"]
        },
        {
          id: "pd-005",
          type: "multiple-choice",
          question: "Which three categories does Column quality display in Power Query?",
          options: [
            "Valid, Error, Empty",
            "Valid, Error, Unknown",
            "Error, Empty, Null",
            "Valid, Invalid, Unknown"
          ],
          correctAnswer: 0,
          explanation:
            "Column quality shows the percentage of Valid, Error, and Empty values in each column.",
          difficulty: "easy",
          tags: ["power-query", "data-profiling"]
        },
        {
          id: "pd-006",
          type: "multiple-choice",
          question: "When automatic type detection is enabled for unstructured sources, which steps are added by default?",
          options: [
            "Promoted Headers and Changed Type",
            "Removed Duplicates and Changed Type",
            "Promoted Headers and Removed Errors",
            "Changed Type and Merge Queries"
          ],
          correctAnswer: 0,
          explanation:
            "Automatic type detection for unstructured sources adds Promote Headers and Changed Type steps by default.",
          difficulty: "medium",
          tags: ["power-query", "data-types"]
        },
        {
          id: "pd-007",
          type: "multiple-choice",
          question: "A CSV has dates in day/month/year format, but your locale is U.S. (month/day/year). Which option ensures correct conversion to Date?",
          options: [
            "Change type using locale",
            "Detect data type",
            "Remove errors",
            "Trim"
          ],
          correctAnswer: 0,
          explanation:
            "Change type using locale lets you specify the correct locale so Power Query interprets dates correctly.",
          difficulty: "medium",
          tags: ["power-query", "data-types", "locale"]
        },
        {
          id: "pd-008",
          type: "multiple-select",
          question: "Which are valid ways to create a Power Query parameter? (Select all that apply)",
          options: [
            "Convert a query that returns a simple constant to a parameter",
            "Use Manage Parameters > New Parameter",
            "Use Merge Queries to create a parameter",
            "Use Append Queries to create a parameter"
          ],
          correctAnswers: [0, 1],
          explanation:
            "You can create parameters by converting a constant-value query or by using the Manage Parameters dialog.",
          difficulty: "medium",
          tags: ["power-query", "parameters"]
        },
        {
          id: "pd-009",
          type: "true-false",
          question: "Parameters are commonly used as step arguments or as inputs to custom functions.",
          correctAnswer: true,
          explanation:
            "Parameters are designed to drive step arguments or custom functions so query results can change dynamically.",
          difficulty: "easy",
          tags: ["power-query", "parameters"]
        },
        {
          id: "pd-010",
          type: "multiple-choice",
          question: "What does the Append Queries operation do?",
          options: [
            "Stacks rows from one or more tables into a single table",
            "Joins tables based on matching keys",
            "Creates a relationship between tables in the model",
            "Splits a column into multiple columns"
          ],
          correctAnswer: 0,
          explanation:
            "Append combines tables by stacking rows into one table (like a UNION).",
          difficulty: "easy",
          tags: ["power-query", "append"]
        },
        {
          id: "pd-011",
          type: "true-false",
          question: "When appending tables with different column headers, missing columns result in null values in the combined table.",
          correctAnswer: true,
          explanation:
            "Append includes all columns from all tables; missing columns for a table are filled with nulls.",
          difficulty: "easy",
          tags: ["power-query", "append"]
        },
        {
          id: "pd-012",
          type: "multiple-select",
          question: "Which join kinds are available in Power Query Merge? (Select all that apply)",
          options: [
            "Left outer",
            "Right outer",
            "Full outer",
            "Inner",
            "Left anti",
            "Right anti",
            "Cross join"
          ],
          correctAnswers: [0, 1, 2, 3, 4, 5],
          explanation:
            "Power Query Merge supports left outer, right outer, full outer, inner, left anti, and right anti joins.",
          difficulty: "medium",
          tags: ["power-query", "merge"]
        },
        {
          id: "pd-013",
          type: "multiple-choice",
          question: "By default, Power Query data profiling runs over how many rows?",
          options: [
            "The first 1,000 rows",
            "The first 10,000 rows",
            "The entire data set",
            "Only rows visible after filters are applied"
          ],
          correctAnswer: 0,
          explanation:
            "By default, data profiling is based on the first 1,000 rows. You can switch to the entire data set if needed.",
          difficulty: "easy",
          tags: ["power-query", "data-profiling"]
        },
        {
          id: "pd-014",
          type: "multiple-choice",
          question: "In Column distribution, what does a Unique value represent?",
          options: [
            "A value that appears only once in the column",
            "A value that is non-null",
            "A value that is numeric",
            "The most frequent value in the column"
          ],
          correctAnswer: 0,
          explanation:
            "Unique values are those that appear only once in the column.",
          difficulty: "easy",
          tags: ["power-query", "data-profiling"]
        },
        {
          id: "pd-015",
          type: "matching",
          question: "Match each Power Query data profiling tool to what it shows.",
          leftItems: [
            { id: "quality", text: "Column quality" },
            { id: "distribution", text: "Column distribution" },
            { id: "profile", text: "Column profile" }
          ],
          rightItems: [
            { id: "status", text: "Valid/Error/Empty/Unknown status bar" },
            { id: "freq", text: "Frequency distribution with distinct and unique counts" },
            { id: "stats", text: "Distribution plus column statistics chart" }
          ],
          correctMatches: {
            quality: "status",
            distribution: "freq",
            profile: "stats"
          },
          explanation:
            "Column quality shows value status, column distribution shows frequency and distinct/unique counts, and column profile adds a statistics chart.",
          difficulty: "medium",
          tags: ["power-query", "data-profiling"]
        },
        {
          id: "pd-016",
          type: "multiple-choice",
          question: "Which Power Query transformation would you use to convert rows into columns?",
          options: [
            "Pivot Column",
            "Unpivot Columns",
            "Transpose Table",
            "Split Column"
          ],
          correctAnswer: 0,
          explanation:
            "Pivot Column converts row values into column headers, effectively rotating data from rows to columns.",
          difficulty: "easy",
          tags: ["power-query", "transformations"]
        },
        {
          id: "pd-017",
          type: "multiple-choice",
          question: "What does the Unpivot Columns transformation do?",
          options: [
            "Converts column headers into row values",
            "Converts row values into column headers",
            "Splits a single column into multiple columns",
            "Removes duplicate rows"
          ],
          correctAnswer: 0,
          explanation:
            "Unpivot Columns transforms column headers into row values, useful for normalizing wide tables.",
          difficulty: "easy",
          tags: ["power-query", "transformations"]
        },
        {
          id: "pd-018",
          type: "multiple-choice",
          question: "Which delimiter option is NOT available when splitting columns in Power Query?",
          options: [
            "Split by JSON path",
            "Split by delimiter",
            "Split by number of characters",
            "Split by positions"
          ],
          correctAnswer: 0,
          explanation:
            "Power Query offers delimiter, number of characters, positions, lowercase to uppercase, uppercase to lowercase, and digit to non-digit options, but not JSON path splitting.",
          difficulty: "medium",
          tags: ["power-query", "transformations"]
        },
        {
          id: "pd-019",
          type: "multiple-choice",
          question: "When using Group By in Power Query, which aggregation is NOT available by default?",
          options: [
            "Mode",
            "Sum",
            "Average",
            "Count Rows"
          ],
          correctAnswer: 0,
          explanation:
            "Default aggregations include Sum, Average, Median, Min, Max, Count Rows, Count Distinct Rows, and All Rows. Mode is not a built-in option.",
          difficulty: "medium",
          tags: ["power-query", "transformations", "aggregation"]
        },
        {
          id: "pd-020",
          type: "multiple-select",
          question: "Which data sources typically support query folding? (Select all that apply)",
          options: [
            "SQL Server",
            "Azure SQL Database",
            "Excel files",
            "CSV files"
          ],
          correctAnswers: [0, 1],
          explanation:
            "Relational database sources like SQL Server and Azure SQL Database support query folding. File-based sources like Excel and CSV generally don't support folding.",
          difficulty: "medium",
          tags: ["power-query", "query-folding", "data-sources"]
        },
        {
          id: "pd-021",
          type: "multiple-choice",
          question: "What is a dataflow in Power BI?",
          options: [
            "A reusable ETL process in the Power BI service that can be shared across workspaces",
            "A type of visual in Power BI reports",
            "A DAX calculation that flows between tables",
            "A type of refresh schedule"
          ],
          correctAnswer: 0,
          explanation:
            "Dataflows are cloud-based ETL processes created and managed in the Power BI service, allowing data prep to be reused across multiple datasets.",
          difficulty: "medium",
          tags: ["dataflows", "service", "etl"]
        },
        {
          id: "pd-022",
          type: "true-false",
          question: "Power Query M language is case-sensitive.",
          correctAnswer: true,
          explanation:
            "M is case-sensitive, so 'table' and 'Table' are different identifiers.",
          difficulty: "easy",
          tags: ["power-query", "m-language"]
        },
        {
          id: "pd-023",
          type: "multiple-choice",
          question: "Which connector would you use to connect to a REST API in Power BI?",
          options: [
            "Web connector or OData connector",
            "SQL Server connector",
            "Excel connector",
            "Folder connector"
          ],
          correctAnswer: 0,
          explanation:
            "REST APIs are accessed using the Web connector (for custom APIs) or OData connector (for OData-compliant APIs).",
          difficulty: "easy",
          tags: ["power-query", "connectors", "api"]
        },
        {
          id: "pd-024",
          type: "multiple-choice",
          question: "What is the primary benefit of creating an index column in Power Query?",
          options: [
            "To create a unique identifier for each row",
            "To improve query folding",
            "To enable incremental refresh",
            "To create relationships in the model"
          ],
          correctAnswer: 0,
          explanation:
            "Index columns create unique sequential numbers for each row, useful for creating keys or maintaining row order.",
          difficulty: "easy",
          tags: ["power-query", "transformations"]
        },
        {
          id: "pd-025",
          type: "multiple-choice",
          question: "Which Privacy Level setting allows data from one source to be combined with any other source?",
          options: [
            "Public",
            "Organizational",
            "Private",
            "None"
          ],
          correctAnswer: 0,
          explanation:
            "Public privacy level allows data to be freely combined with any other source.",
          difficulty: "easy",
          tags: ["power-query", "privacy-levels", "security"]
        }
      ],
    },
    {
      id: "model-data",
      title: "Model the Data",
      description:
        "Design and develop a data model, create model calculations using DAX, and optimize model performance.",
      estimatedTime: "45 minutes",
      questions: [
        {
          id: "md-001",
          type: "multiple-choice",
          question: "In a star schema, which statement best describes dimension tables?",
          options: [
            "They describe business entities used for filtering and grouping, such as products or dates.",
            "They store transactional events and numeric measures.",
            "They are only used for calculations in DAX.",
            "They always contain many-to-many relationships."
          ],
          correctAnswer: 0,
          explanation:
            "Dimension tables describe business entities and provide columns used for filtering and grouping.",
          difficulty: "easy",
          tags: ["data-modeling", "star-schema"]
        },
        {
          id: "md-002",
          type: "multiple-choice",
          question: "In a typical one-to-many relationship in a star schema, which side is the dimension table?",
          options: [
            "The \"one\" side",
            "The \"many\" side",
            "Either side depending on filters",
            "Neither; both sides are facts"
          ],
          correctAnswer: 0,
          explanation:
            "In a one-to-many relationship, the \"one\" side is the dimension table and the \"many\" side is the fact table.",
          difficulty: "easy",
          tags: ["data-modeling", "relationships"]
        },
        {
          id: "md-003",
          type: "multiple-choice",
          question: "What does a single cross-filter direction mean in Power BI relationships?",
          options: [
            "Filters flow in one direction along the relationship.",
            "Filters flow both directions only for measures.",
            "Filters flow both directions only for calculated columns.",
            "Filters don't flow at all."
          ],
          correctAnswer: 0,
          explanation:
            "Single cross-filter direction means filters propagate in one direction along the relationship.",
          difficulty: "medium",
          tags: ["data-modeling", "relationships"]
        },
        {
          id: "md-004",
          type: "multiple-choice",
          question: "For a one-to-one relationship, what cross-filter direction is available?",
          options: [
            "Both directions only",
            "Single direction only",
            "No filtering is allowed",
            "Only from the table with more rows"
          ],
          correctAnswer: 0,
          explanation:
            "One-to-one relationships use bi-directional filtering (both directions).",
          difficulty: "medium",
          tags: ["data-modeling", "relationships"]
        },
        {
          id: "md-005",
          type: "multiple-choice",
          question: "When you mark a table as a date table, Power BI validates which requirement?",
          options: [
            "The date column contains unique, contiguous, non-null dates.",
            "The date column is text.",
            "The table has at least two date columns.",
            "The table includes a fiscal year column."
          ],
          correctAnswer: 0,
          explanation:
            "Power BI validates that the date column is unique, contiguous, and has no nulls when you mark a date table.",
          difficulty: "medium",
          tags: ["data-modeling", "date-table"]
        },
        {
          id: "md-006",
          type: "multiple-choice",
          question: "You must mark a date table when using which type of time intelligence?",
          options: [
            "Classic time intelligence",
            "Calendar-based time intelligence (always required)",
            "Quick measures only",
            "Visual-level filters only"
          ],
          correctAnswer: 0,
          explanation:
            "Marking a date table is required for classic time intelligence; it's not required for calendar-based time intelligence in most cases.",
          difficulty: "medium",
          tags: ["data-modeling", "date-table", "time-intelligence"]
        },
        {
          id: "md-007",
          type: "multiple-choice",
          question: "Which statement correctly describes DAX row context and filter context?",
          options: [
            "Row context is the current row (used in calculated columns/iterators); filter context is the set of filters used to evaluate measures.",
            "Row context is created only by measures; filter context only by calculated columns.",
            "Row context and filter context are the same thing.",
            "Row context applies only to visuals; filter context applies only to tables."
          ],
          correctAnswer: 0,
          explanation:
            "Row context represents the current row, while filter context represents filters that affect measure evaluation.",
          difficulty: "medium",
          tags: ["dax", "context"]
        },
        {
          id: "md-008",
          type: "true-false",
          question: "The CALCULATE function evaluates an expression in a modified filter context.",
          correctAnswer: true,
          explanation:
            "CALCULATE modifies the filter context before evaluating the expression.",
          difficulty: "medium",
          tags: ["dax", "calculate", "context"]
        },
        {
          id: "md-009",
          type: "multiple-choice",
          question: "Which statement about measures is true?",
          options: [
            "Measures are calculated as needed and their results aren't stored on disk.",
            "Measures are stored in the model and updated only during refresh.",
            "Measures can only be used in slicers.",
            "Measures can only be created in Power Query."
          ],
          correctAnswer: 0,
          explanation:
            "Measures are evaluated at query time and aren't stored in the model.",
          difficulty: "easy",
          tags: ["dax", "measures"]
        },
        {
          id: "md-010",
          type: "multiple-choice",
          question: "Which statement about calculated columns is true?",
          options: [
            "Calculated columns are stored in the model and can be used in slicers, filters, rows, and columns on visuals.",
            "Calculated columns are evaluated only at query time.",
            "Calculated columns can only be used as values in visuals.",
            "Calculated columns can't be used for filtering."
          ],
          correctAnswer: 0,
          explanation:
            "Calculated columns are stored in the model and can be used for filtering and grouping.",
          difficulty: "easy",
          tags: ["dax", "calculated-columns"]
        },
        {
          id: "md-011",
          type: "multiple-choice",
          question: "What does Dual storage mode allow a table to do?",
          options: [
            "Act as Import or DirectQuery depending on the query.",
            "Use both row-level security and object-level security simultaneously.",
            "Store two copies of the table in the model.",
            "Automatically create aggregations."
          ],
          correctAnswer: 0,
          explanation:
            "Dual tables can behave as Import or DirectQuery depending on how a query is executed.",
          difficulty: "medium",
          tags: ["storage-modes", "performance"]
        },
        {
          id: "md-012",
          type: "multiple-choice",
          question: "Which statement about switching an Import-only model to DirectQuery is correct?",
          options: [
            "You can't toggle the entire model; you must add DirectQuery tables or build a composite model.",
            "You can switch the entire model with a single setting.",
            "It requires only changing the privacy level.",
            "It happens automatically when you publish."
          ],
          correctAnswer: 0,
          explanation:
            "Import-only models can't be globally switched to DirectQuery; you must add DirectQuery tables or use a composite model.",
          difficulty: "medium",
          tags: ["directquery", "storage-modes", "modeling"]
        },
        {
          id: "md-013",
          type: "open-text",
          question: "Which DAX function activates an inactive relationship in a calculation?",
          acceptedAnswers: ["USERELATIONSHIP"],
          caseSensitive: false,
          explanation:
            "USERELATIONSHIP activates an inactive relationship for the duration of the calculation.",
          difficulty: "medium",
          tags: ["dax", "relationships"]
        },
        {
          id: "md-014",
          type: "multiple-choice",
          question: "How many active relationships can exist between two tables at a time in Power BI?",
          options: [
            "Only one",
            "Two",
            "Unlimited",
            "Depends on storage mode"
          ],
          correctAnswer: 0,
          explanation:
            "Only one relationship between two tables can be active at a time.",
          difficulty: "easy",
          tags: ["data-modeling", "relationships"]
        },
        {
          id: "md-015",
          type: "multiple-choice",
          question: "When Assume referential integrity is enabled for a DirectQuery relationship, what happens to joins sent to the data source?",
          options: [
            "INNER JOIN is used instead of OUTER JOIN",
            "OUTER JOIN is always used",
            "Cross joins are used",
            "Joins are removed and filters are applied locally"
          ],
          correctAnswer: 0,
          explanation:
            "Assume referential integrity allows Power BI to send INNER JOINs instead of OUTER JOINs when integrity is guaranteed.",
          difficulty: "medium",
          tags: ["directquery", "relationships", "performance"]
        },
        {
          id: "md-016",
          type: "open-text",
          question: "Which DAX function returns a table with a single column of distinct values from a specified column?",
          acceptedAnswers: ["VALUES", "DISTINCT"],
          caseSensitive: false,
          explanation:
            "Both VALUES and DISTINCT return distinct values, but VALUES includes the blank row added by relationships, while DISTINCT excludes it.",
          difficulty: "medium",
          tags: ["dax", "table-functions"]
        },
        {
          id: "md-017",
          type: "multiple-choice",
          question: "What does the RELATED function do in DAX?",
          options: [
            "Returns a related value from another table in a one-to-many relationship (from the many side to the one side)",
            "Creates a relationship between tables",
            "Filters a table based on related values",
            "Counts related rows"
          ],
          correctAnswer: 0,
          explanation:
            "RELATED traverses relationships to get a value from the 'one' side of a one-to-many relationship.",
          difficulty: "medium",
          tags: ["dax", "relationships"]
        },
        {
          id: "md-018",
          type: "multiple-choice",
          question: "What does RELATEDTABLE return in DAX?",
          options: [
            "A table of all related rows from the many side of a relationship",
            "A single related value",
            "The number of related rows",
            "A boolean indicating if relationships exist"
          ],
          correctAnswer: 0,
          explanation:
            "RELATEDTABLE returns all related rows from the 'many' side of a one-to-many relationship.",
          difficulty: "medium",
          tags: ["dax", "relationships", "table-functions"]
        },
        {
          id: "md-019",
          type: "multiple-choice",
          question: "Which iterator function would you use to calculate a weighted average?",
          options: [
            "SUMX and SUM",
            "AVERAGEX only",
            "COUNTX",
            "FILTER"
          ],
          correctAnswer: 0,
          explanation:
            "Weighted averages require SUMX to multiply and sum (numerator) divided by SUM of weights (denominator).",
          difficulty: "hard",
          tags: ["dax", "iterators", "calculations"]
        },
        {
          id: "md-020",
          type: "multiple-select",
          question: "Which DAX functions remove filters? (Select all that apply)",
          options: [
            "ALL",
            "ALLEXCEPT",
            "ALLSELECTED",
            "FILTER",
            "CALCULATE"
          ],
          correctAnswers: [0, 1, 2],
          explanation:
            "ALL, ALLEXCEPT, and ALLSELECTED remove filters. FILTER applies filters, and CALCULATE modifies filter context.",
          difficulty: "medium",
          tags: ["dax", "filter-functions", "context"]
        },
        {
          id: "md-021",
          type: "multiple-choice",
          question: "What is the difference between ALL and ALLEXCEPT?",
          options: [
            "ALLEXCEPT removes all filters except those on specified columns",
            "ALL removes all filters; ALLEXCEPT adds filters",
            "They are identical functions",
            "ALLEXCEPT works only on measures"
          ],
          correctAnswer: 0,
          explanation:
            "ALLEXCEPT removes all filters from a table except those on columns you specify.",
          difficulty: "medium",
          tags: ["dax", "filter-functions"]
        },
        {
          id: "md-022",
          type: "open-text",
          question: "Which DAX function calculates year-to-date totals?",
          acceptedAnswers: ["TOTALYTD"],
          caseSensitive: false,
          explanation:
            "TOTALYTD is a classic time intelligence function that calculates year-to-date values.",
          difficulty: "easy",
          tags: ["dax", "time-intelligence"]
        },
        {
          id: "md-023",
          type: "multiple-choice",
          question: "Which time intelligence function returns values from the same period last year?",
          options: [
            "SAMEPERIODLASTYEAR",
            "TOTALYTD",
            "DATEADD",
            "PREVIOUSYEAR"
          ],
          correctAnswer: 0,
          explanation:
            "SAMEPERIODLASTYEAR shifts dates back one year, commonly used for year-over-year comparisons.",
          difficulty: "easy",
          tags: ["dax", "time-intelligence"]
        },
        {
          id: "md-024",
          type: "multiple-choice",
          question: "What does the DATEADD function do?",
          options: [
            "Shifts a date column by a specified number of intervals",
            "Adds two dates together",
            "Creates a date table",
            "Formats dates for display"
          ],
          correctAnswer: 0,
          explanation:
            "DATEADD shifts dates by a specified number of intervals (day, month, quarter, or year), useful for custom time comparisons.",
          difficulty: "medium",
          tags: ["dax", "time-intelligence"]
        },
        {
          id: "md-025",
          type: "multiple-choice",
          question: "When creating a hierarchy, what is the correct order from highest to lowest level?",
          options: [
            "Year > Quarter > Month > Day",
            "Day > Month > Quarter > Year",
            "Month > Quarter > Year > Day",
            "Hierarchies don't have a required order"
          ],
          correctAnswer: 0,
          explanation:
            "Hierarchies should flow from highest (most aggregated) to lowest (most detailed) level for proper drill-down behavior.",
          difficulty: "easy",
          tags: ["data-modeling", "hierarchies"]
        },
        {
          id: "md-026",
          type: "multiple-choice",
          question: "What is bi-directional cross-filtering most commonly used for?",
          options: [
            "Many-to-many relationship scenarios",
            "All one-to-many relationships",
            "Calculated columns only",
            "Increasing model size"
          ],
          correctAnswer: 0,
          explanation:
            "Bi-directional filtering is often used for many-to-many scenarios, though it can impact performance and should be used carefully.",
          difficulty: "medium",
          tags: ["data-modeling", "relationships", "filtering"]
        },
        {
          id: "md-027",
          type: "true-false",
          question: "Calculated tables are computed at query time and don't consume storage.",
          correctAnswer: false,
          explanation:
            "Calculated tables are stored in the model and consume memory, unlike measures which are computed at query time.",
          difficulty: "medium",
          tags: ["dax", "calculated-tables"]
        },
        {
          id: "md-028",
          type: "multiple-choice",
          question: "What is the primary purpose of calculation groups?",
          options: [
            "Apply common calculations to multiple measures without creating new measures",
            "Group tables in the model view",
            "Create user-defined aggregations",
            "Define row-level security rules"
          ],
          correctAnswer: 0,
          explanation:
            "Calculation groups allow you to define calculations once and apply them to multiple measures, reducing measure proliferation.",
          difficulty: "hard",
          tags: ["dax", "calculation-groups"]
        },
        {
          id: "md-029",
          type: "multiple-choice",
          question: "Which storage mode provides the fastest query performance?",
          options: [
            "Import",
            "DirectQuery",
            "Dual",
            "All modes perform equally"
          ],
          correctAnswer: 0,
          explanation:
            "Import mode loads data into memory, providing the fastest query performance. DirectQuery queries the source directly.",
          difficulty: "easy",
          tags: ["storage-modes", "performance"]
        },
        {
          id: "md-030",
          type: "multiple-select",
          question: "Which factors affect DAX query performance? (Select all that apply)",
          options: [
            "Column cardinality",
            "Number of relationships",
            "Data type choices",
            "Visual type"
          ],
          correctAnswers: [0, 1, 2],
          explanation:
            "Column cardinality, relationship complexity, and data types all impact DAX performance. Visual type affects rendering but not DAX calculation.",
          difficulty: "hard",
          tags: ["dax", "performance", "optimization"]
        }
      ],
    },
    {
      id: "visualize-analyze",
      title: "Visualize and Analyze the Data",
      description:
        "Create reports and dashboards, enhance reports for usability and storytelling, and perform advanced analysis.",
      estimatedTime: "40 minutes",
      questions: [
        {
          id: "va-001",
          type: "multiple-choice",
          question: "To create a drillthrough page, where do you add the field that defines the drillthrough context?",
          options: [
            "The Drillthrough filters well on the target page",
            "The Visualizations pane's Values field",
            "The model relationships view",
            "The query parameters pane"
          ],
          correctAnswer: 0,
          explanation:
            "Drillthrough is configured by adding a field to the Drillthrough filters well on the target page.",
          difficulty: "easy",
          tags: ["drillthrough", "navigation"]
        },
        {
          id: "va-002",
          type: "true-false",
          question: "Drillthrough lets a user navigate to another page filtered to the selected value.",
          correctAnswer: true,
          explanation:
            "Drillthrough passes the selected context to a detail page so the page is filtered to the chosen value.",
          difficulty: "easy",
          tags: ["drillthrough", "analysis"]
        },
        {
          id: "va-003",
          type: "multiple-choice",
          question: "Which requirement is necessary for cross-report drillthrough?",
          options: [
            "Both reports are in the same workspace and matching fields have the same name and data type.",
            "The reports can be in any workspace as long as they share a dataset.",
            "The target report must be in a different tenant.",
            "Cross-report drillthrough works only in Power BI Desktop."
          ],
          correctAnswer: 0,
          explanation:
            "Cross-report drillthrough requires matching fields and that both reports are published to the same workspace with the feature enabled.",
          difficulty: "medium",
          tags: ["drillthrough", "service"]
        },
        {
          id: "va-004",
          type: "multiple-choice",
          question: "Where are report page tooltips not supported?",
          options: [
            "Dashboards (pinned tiles)",
            "Power BI Desktop",
            "Power BI service reports",
            "Power BI mobile app for iPad"
          ],
          correctAnswer: 0,
          explanation:
            "Dashboard tiles don't support report page tooltips.",
          difficulty: "medium",
          tags: ["tooltips", "dashboards"]
        },
        {
          id: "va-005",
          type: "multiple-choice",
          question: "To manually assign a report page tooltip to a visual, which UI element do you use?",
          options: [
            "The Tooltip card in the visual's Format pane",
            "The Modeling tab",
            "The Fields pane",
            "The Query Dependencies view"
          ],
          correctAnswer: 0,
          explanation:
            "You assign a report page tooltip by selecting the tooltip page in the Tooltip card for the visual.",
          difficulty: "medium",
          tags: ["tooltips", "report-design"]
        },
        {
          id: "va-006",
          type: "multiple-choice",
          question: "Report bookmarks capture which of the following?",
          options: [
            "Filters, slicers, visual state, and sort order",
            "Only filters",
            "Only page layout positions",
            "Only data model changes"
          ],
          correctAnswer: 0,
          explanation:
            "Bookmarks capture the current page state including filters, slicers, visual selection, and sort order.",
          difficulty: "medium",
          tags: ["bookmarks", "storytelling"]
        },
        {
          id: "va-007",
          type: "multiple-choice",
          question: "Which statement about bookmark groups is true?",
          options: [
            "You can group report bookmarks, but not personal bookmarks.",
            "Only personal bookmarks can be grouped.",
            "Bookmark groups are created automatically.",
            "Groups can include visuals but not bookmarks."
          ],
          correctAnswer: 0,
          explanation:
            "Bookmark groups are available for report bookmarks; personal bookmarks can't be grouped.",
          difficulty: "medium",
          tags: ["bookmarks", "storytelling"]
        },
        {
          id: "va-008",
          type: "multiple-choice",
          question: "Which option controls whether a bookmark changes the current page when selected?",
          options: ["Current page", "Data", "Display", "All visuals"],
          correctAnswer: 0,
          explanation:
            "The Current page option determines whether selecting a bookmark navigates to the saved page.",
          difficulty: "medium",
          tags: ["bookmarks", "report-design"]
        },
        {
          id: "va-009",
          type: "multiple-choice",
          question: "Which three format styles are available for conditional formatting?",
          options: [
            "Gradient, Rules, Field value",
            "Theme, Palette, Threshold",
            "Heatmap, KPI, Waterfall",
            "Color scale, Bands, Labels"
          ],
          correctAnswer: 0,
          explanation:
            "Conditional formatting supports Gradient, Rules, and Field value styles.",
          difficulty: "easy",
          tags: ["conditional-formatting", "visualizations"]
        },
        {
          id: "va-010",
          type: "multiple-choice",
          question: "What is the only required property in a report theme JSON file?",
          options: ["name", "dataColors", "background", "foreground"],
          correctAnswer: 0,
          explanation:
            "The report theme JSON requires only a name; all other properties are optional.",
          difficulty: "easy",
          tags: ["themes", "report-design"]
        },
        {
          id: "va-011",
          type: "multiple-choice",
          question: "Which accessibility guideline is recommended for text contrast in Power BI reports?",
          options: [
            "At least 4.5:1 contrast between text and background",
            "At least 2:1 contrast between text and background",
            "At least 10:1 contrast between text and background",
            "No specific contrast guidance"
          ],
          correctAnswer: 0,
          explanation:
            "Power BI accessibility guidance recommends a minimum 4.5:1 text-to-background contrast ratio.",
          difficulty: "easy",
          tags: ["accessibility", "report-design"]
        },
        {
          id: "va-012",
          type: "multiple-choice",
          question: "Which statement about Performance Analyzer is true?",
          options: [
            "You can copy a visual's DAX query and run it in DAX query view.",
            "It only shows refresh errors, not timings.",
            "It works only in the Power BI service.",
            "It automatically rewrites your measures."
          ],
          correctAnswer: 0,
          explanation:
            "Performance Analyzer lets you copy visual queries and run them in DAX query view for deeper analysis.",
          difficulty: "medium",
          tags: ["performance", "analysis"]
        },
        {
          id: "va-013",
          type: "multiple-choice",
          question: "What happens to unrelated data when a visual cross-highlights other visuals?",
          options: [
            "Unrelated data remains visible but dimmed",
            "Unrelated data is hidden",
            "Unrelated data is deleted from the model",
            "Only tooltip values change"
          ],
          correctAnswer: 0,
          explanation:
            "Cross-highlighting keeps unrelated data visible but dimmed while highlighting related data.",
          difficulty: "easy",
          tags: ["interactions", "visualizations"]
        },
        {
          id: "va-014",
          type: "multiple-choice",
          question: "Where do you enable Edit interactions in Power BI Desktop?",
          options: [
            "Format > Edit interactions",
            "View > Performance analyzer",
            "Modeling > Manage relationships",
            "File > Options > Preview features"
          ],
          correctAnswer: 0,
          explanation:
            "Edit interactions is enabled from the Format tab in Power BI Desktop.",
          difficulty: "easy",
          tags: ["report-design", "interactions"]
        },
        {
          id: "va-015",
          type: "drag-and-drop",
          question: "Assign each interaction behavior to cross-filtering or cross-highlighting.",
          items: [
            "Unrelated data is hidden in the target visual",
            "Unrelated data remains visible but dimmed",
            "Acts like a filter on other visuals",
            "Highlights related data within other visuals"
          ],
          dropZones: [
            { id: "cross-filter", label: "Cross-filtering", acceptedItems: ["0", "2"] },
            { id: "cross-highlight", label: "Cross-highlighting", acceptedItems: ["1", "3"] }
          ],
          correctMapping: {
            "0": "cross-filter",
            "1": "cross-highlight",
            "2": "cross-filter",
            "3": "cross-highlight"
          },
          explanation:
            "Cross-filtering removes unrelated data, while cross-highlighting keeps it visible but dimmed and highlights related data.",
          difficulty: "medium",
          tags: ["interactions", "visualizations"]
        },
        {
          id: "va-016",
          type: "multiple-choice",
          question: "Which visual is best for showing trends over time with multiple measures?",
          options: [
            "Line chart",
            "Pie chart",
            "Card",
            "Slicer"
          ],
          correctAnswer: 0,
          explanation:
            "Line charts excel at showing trends and patterns over time, especially with continuous data.",
          difficulty: "easy",
          tags: ["visualizations", "charts"]
        },
        {
          id: "va-017",
          type: "multiple-choice",
          question: "Which visual automatically performs AI-driven root cause analysis?",
          options: [
            "Key influencers",
            "Decomposition tree",
            "Matrix",
            "Scatter chart"
          ],
          correctAnswer: 0,
          explanation:
            "The Key influencers visual uses AI to identify factors that drive a metric up or down.",
          difficulty: "medium",
          tags: ["visualizations", "ai", "analysis"]
        },
        {
          id: "va-018",
          type: "multiple-choice",
          question: "What does the Decomposition tree visual allow you to do?",
          options: [
            "Break down a measure across multiple dimensions with ad-hoc path selection",
            "Create organizational charts",
            "Build decision trees for forecasting",
            "Analyze sentiment in text"
          ],
          correctAnswer: 0,
          explanation:
            "Decomposition tree lets users interactively explore data by breaking it down across different dimensions.",
          difficulty: "medium",
          tags: ["visualizations", "analysis"]
        },
        {
          id: "va-019",
          type: "multiple-choice",
          question: "Which visual type is used to ask questions in natural language?",
          options: [
            "Q&A",
            "Smart narrative",
            "Key influencers",
            "Slicer"
          ],
          correctAnswer: 0,
          explanation:
            "The Q&A visual allows users to type questions in natural language and get visual answers.",
          difficulty: "easy",
          tags: ["visualizations", "q-and-a", "ai"]
        },
        {
          id: "va-020",
          type: "multiple-choice",
          question: "What does the Smart narrative visual do?",
          options: [
            "Automatically generates text summaries of data insights",
            "Creates interactive stories",
            "Allows natural language questions",
            "Displays KPIs"
          ],
          correctAnswer: 0,
          explanation:
            "Smart narrative uses AI to generate text summaries describing key insights from your data.",
          difficulty: "easy",
          tags: ["visualizations", "ai", "narrative"]
        },
        {
          id: "va-021",
          type: "multiple-choice",
          question: "What is a KPI visual used for?",
          options: [
            "Showing progress toward a measurable goal with target and status indicators",
            "Displaying key phrases from text",
            "Creating pivot tables",
            "Building hierarchies"
          ],
          correctAnswer: 0,
          explanation:
            "KPI visuals display a metric's current value, goal, and status indicator (typically with trend information).",
          difficulty: "easy",
          tags: ["visualizations", "kpi"]
        },
        {
          id: "va-022",
          type: "multiple-choice",
          question: "How do you sync slicers across multiple pages?",
          options: [
            "Select the slicer, go to View > Sync slicers, then choose which pages to sync",
            "Copy and paste the slicer to each page",
            "Use Edit interactions",
            "Create a bookmark"
          ],
          correctAnswer: 0,
          explanation:
            "The Sync slicers pane allows you to sync slicer selections across multiple report pages.",
          difficulty: "medium",
          tags: ["slicers", "report-design", "interactions"]
        },
        {
          id: "va-023",
          type: "multiple-choice",
          question: "What is a what-if parameter used for?",
          options: [
            "Creating scenarios by allowing users to change input values and see results",
            "Filtering data in Power Query",
            "Creating relationships",
            "Defining row-level security"
          ],
          correctAnswer: 0,
          explanation:
            "What-if parameters create a calculated table and slicer that let users explore different scenarios by changing values.",
          difficulty: "medium",
          tags: ["parameters", "analysis", "scenario"]
        },
        {
          id: "va-024",
          type: "multiple-choice",
          question: "Where do you configure a mobile-optimized layout for a report?",
          options: [
            "View > Mobile layout",
            "Format > Mobile settings",
            "File > Mobile export",
            "Mobile layouts cannot be customized"
          ],
          correctAnswer: 0,
          explanation:
            "Mobile layout view allows you to create a phone-optimized version of your report pages.",
          difficulty: "easy",
          tags: ["mobile", "report-design"]
        },
        {
          id: "va-025",
          type: "multiple-select",
          question: "Which button actions are available in Power BI? (Select all that apply)",
          options: [
            "Back",
            "Bookmark",
            "Page navigation",
            "Q&A",
            "Web URL"
          ],
          correctAnswers: [0, 1, 2, 3, 4],
          explanation:
            "All listed actions are available for buttons: Back, Bookmark, Page navigation, Q&A, and Web URL.",
          difficulty: "medium",
          tags: ["buttons", "navigation", "report-design"]
        },
        {
          id: "va-026",
          type: "multiple-choice",
          question: "What does the Matrix visual provide that a Table visual doesn't?",
          options: [
            "Row and column hierarchies with expand/collapse functionality",
            "Conditional formatting",
            "Sorting",
            "Export to Excel"
          ],
          correctAnswer: 0,
          explanation:
            "Matrix visuals support hierarchies on both rows and columns with drill-down capability, unlike simple tables.",
          difficulty: "easy",
          tags: ["visualizations", "matrix"]
        },
        {
          id: "va-027",
          type: "true-false",
          question: "Field parameters allow users to dynamically change which fields are used in a visual.",
          correctAnswer: true,
          explanation:
            "Field parameters create a dynamic list of fields that users can switch between using a slicer, changing what's displayed in visuals.",
          difficulty: "medium",
          tags: ["parameters", "visualizations"]
        },
        {
          id: "va-028",
          type: "multiple-choice",
          question: "Where can you import custom visuals from?",
          options: [
            "AppSource or import from file",
            "Only from Microsoft",
            "Power Query editor",
            "DAX Studio"
          ],
          correctAnswer: 0,
          explanation:
            "Custom visuals can be imported from AppSource (Microsoft's marketplace) or from .pbiviz files.",
          difficulty: "easy",
          tags: ["visualizations", "custom-visuals"]
        },
        {
          id: "va-029",
          type: "multiple-choice",
          question: "What is the Funnel visual primarily used for?",
          options: [
            "Showing sequential stages in a process with decreasing values",
            "Comparing parts to a whole",
            "Displaying trends over time",
            "Showing correlations between variables"
          ],
          correctAnswer: 0,
          explanation:
            "Funnel visuals display sequential stages where values typically decrease at each stage (like a sales pipeline).",
          difficulty: "easy",
          tags: ["visualizations", "funnel"]
        },
        {
          id: "va-030",
          type: "multiple-choice",
          question: "When would you use a Scatter chart?",
          options: [
            "To identify correlations or patterns between two or three measures",
            "To show parts of a whole",
            "To display hierarchical data",
            "To show trends over time"
          ],
          correctAnswer: 0,
          explanation:
            "Scatter charts plot data points using two or three measures on axes, revealing correlations and patterns.",
          difficulty: "easy",
          tags: ["visualizations", "scatter"]
        }
      ],
    },
    {
      id: "deploy-maintain",
      title: "Deploy and Maintain Assets",
      description:
        "Manage datasets, create and manage workspaces, and manage Power BI assets.",
      estimatedTime: "25 minutes",
      questions: [
        {
          id: "dm-001",
          type: "multiple-choice",
          question: "Which workspace role is intended for viewing and interacting with content, without editing it?",
          options: ["Admin", "Member", "Contributor", "Viewer"],
          correctAnswer: 3,
          explanation:
            "The Viewer role is for viewing and interacting with content without edit permissions.",
          difficulty: "easy",
          tags: ["workspaces", "security"]
        },
        {
          id: "dm-002",
          type: "multiple-choice",
          question: "If you want row-level security (RLS) to apply to a workspace user, which role should they have?",
          options: ["Admin", "Member", "Contributor", "Viewer"],
          correctAnswer: 3,
          explanation:
            "RLS doesn't apply to Admin, Member, or Contributor roles; assign Viewer for RLS to take effect.",
          difficulty: "medium",
          tags: ["rls", "security"]
        },
        {
          id: "dm-003",
          type: "multiple-choice",
          question: "Where are RLS roles defined for a Power BI semantic model?",
          options: ["Power BI Desktop", "Power BI service only", "Power Query editor", "Gateway settings"],
          correctAnswer: 0,
          explanation:
            "RLS roles are defined in Power BI Desktop for semantic models.",
          difficulty: "easy",
          tags: ["rls", "security", "desktop"]
        },
        {
          id: "dm-004",
          type: "multiple-choice",
          question: "Which approach is recommended for mapping users to RLS roles?",
          options: ["Security groups", "Individual users only", "Dataset owners only", "Service principals"],
          correctAnswer: 0,
          explanation:
            "Best practice is to map security groups to RLS roles so membership is managed centrally.",
          difficulty: "medium",
          tags: ["rls", "security", "best-practices"]
        },
        {
          id: "dm-005",
          type: "multiple-choice",
          question: "In the Power BI service, what effect do sensitivity labels have on access control?",
          options: [
            "They don't change access; permissions still control access.",
            "They automatically revoke access for viewers.",
            "They enforce row-level security.",
            "They replace workspace roles."
          ],
          correctAnswer: 0,
          explanation:
            "In the service, sensitivity labels don't affect access; Power BI permissions still control access.",
          difficulty: "medium",
          tags: ["sensitivity-labels", "governance"]
        },
        {
          id: "dm-006",
          type: "multiple-choice",
          question: "Sensitivity label protection is applied when data leaves the Power BI service through which path?",
          options: [
            "Export to Excel, PowerPoint, or PDF, or download PBIX",
            "Export to CSV",
            "Printing a report",
            "Viewing in the service"
          ],
          correctAnswer: 0,
          explanation:
            "Sensitivity labels apply protection to supported export paths like Excel, PowerPoint, PDF, and PBIX downloads.",
          difficulty: "medium",
          tags: ["sensitivity-labels", "governance", "export"]
        },
        {
          id: "dm-007",
          type: "multiple-choice",
          question: "Which parameters are required to configure incremental refresh in Power BI Desktop?",
          options: [
            "RangeStart and RangeEnd parameters (Date/Time, case-sensitive)",
            "StartDate and EndDate (text)",
            "RefreshFrom and RefreshTo (numeric)",
            "LastUpdated and LastFullRefresh"
          ],
          correctAnswer: 0,
          explanation:
            "Incremental refresh requires RangeStart and RangeEnd Date/Time parameters with exact casing.",
          difficulty: "hard",
          tags: ["incremental-refresh", "refresh"]
        },
        {
          id: "dm-008",
          type: "multiple-choice",
          question: "After publishing a model with incremental refresh, what happens to the RangeStart/RangeEnd values used in Desktop?",
          options: [
            "The service policy overrides them to create refresh windows.",
            "They continue to filter data exactly as entered.",
            "They are ignored and no incremental refresh occurs.",
            "They are converted to text parameters."
          ],
          correctAnswer: 0,
          explanation:
            "After publish, the incremental refresh policy in the service overrides the RangeStart/RangeEnd values used in Desktop.",
          difficulty: "hard",
          tags: ["incremental-refresh", "refresh"]
        },
        {
          id: "dm-009",
          type: "multiple-choice",
          question: "When do you generally need an on-premises data gateway?",
          options: [
            "When the data source is on-premises or in a private network",
            "Whenever you use Import mode",
            "Only for cloud data sources",
            "Only for Excel files in OneDrive"
          ],
          correctAnswer: 0,
          explanation:
            "Gateways are needed for on-premises or private network sources (or when connector hosting is required).",
          difficulty: "medium",
          tags: ["gateway", "refresh"]
        },
        {
          id: "dm-010",
          type: "multiple-choice",
          question: "In a DirectQuery or live connection model, how does scheduled refresh affect data?",
          options: [
            "Most source data isn't imported, but some metadata (such as role updates) can still require processing.",
            "All data is re-imported on the schedule.",
            "Scheduled refresh is mandatory for visuals to update.",
            "Scheduled refresh is disabled and unavailable."
          ],
          correctAnswer: 0,
          explanation:
            "DirectQuery/live connection models don't import most data, though some metadata may still require processing.",
          difficulty: "medium",
          tags: ["refresh", "directquery"]
        },
        {
          id: "dm-011",
          type: "multiple-choice",
          question: "What can Power BI apps do with audiences?",
          options: [
            "Create multiple audiences and show or hide content per audience.",
            "Allow only one audience per app.",
            "Prevent any sharing outside the workspace.",
            "Disable all report interactions."
          ],
          correctAnswer: 0,
          explanation:
            "Apps can define multiple audiences and tailor content visibility per audience.",
          difficulty: "easy",
          tags: ["apps", "distribution"]
        },
        {
          id: "dm-012",
          type: "multiple-choice",
          question: "Which app setting grants users build permission on the semantic models in the app?",
          options: [
            "Allow users to build content with the semantic models in this app",
            "Install this app automatically",
            "Show Copilot in app navigation",
            "Entire organization"
          ],
          correctAnswer: 0,
          explanation:
            "The build permission setting lets app users create their own reports from the app's semantic models.",
          difficulty: "medium",
          tags: ["apps", "permissions"]
        },
        {
          id: "dm-013",
          type: "fill-in-blank",
          question: "Incremental refresh requires specific parameter names.",
          template: "Incremental refresh requires date/time parameters named ___ and ___ in Power Query.",
          blanks: [
            { id: "range-start", acceptedAnswers: ["RangeStart"], caseSensitive: true },
            { id: "range-end", acceptedAnswers: ["RangeEnd"], caseSensitive: true }
          ],
          explanation:
            "Incremental refresh uses reserved, case-sensitive RangeStart and RangeEnd parameters of type Date/Time.",
          difficulty: "medium",
          tags: ["incremental-refresh", "power-query", "refresh"]
        },
        {
          id: "dm-014",
          type: "multiple-choice",
          question: "After publishing a model with incremental refresh, what happens to the RangeStart and RangeEnd values set in Desktop?",
          options: [
            "They are overridden by the service based on the refresh policy",
            "They remain fixed forever",
            "They are removed from the model",
            "They become text parameters"
          ],
          correctAnswer: 0,
          explanation:
            "After publish, the service uses the incremental refresh policy to determine the refresh windows, overriding Desktop values.",
          difficulty: "medium",
          tags: ["incremental-refresh", "service", "refresh"]
        },
        {
          id: "dm-015",
          type: "multiple-choice",
          question: "What data type must the RangeStart and RangeEnd parameters use for incremental refresh?",
          options: [
            "Date/Time",
            "Date only",
            "Text",
            "Whole number"
          ],
          correctAnswer: 0,
          explanation:
            "RangeStart and RangeEnd must be Date/Time parameters for incremental refresh to work.",
          difficulty: "easy",
          tags: ["incremental-refresh", "refresh"]
        },
        {
          id: "dm-016",
          type: "multiple-choice",
          question: "What are deployment pipelines used for in Power BI?",
          options: [
            "Managing content lifecycle across development, test, and production stages",
            "Creating data transformations",
            "Building DAX measures",
            "Scheduling refreshes"
          ],
          correctAnswer: 0,
          explanation:
            "Deployment pipelines provide a structured way to develop, test, and deploy Power BI content across stages.",
          difficulty: "medium",
          tags: ["deployment", "pipelines", "alm"]
        },
        {
          id: "dm-017",
          type: "multiple-choice",
          question: "What does endorsing a dataset as 'Certified' indicate?",
          options: [
            "The dataset meets organizational quality standards and is approved for broad use",
            "The dataset contains certified professional data",
            "The dataset is read-only",
            "The dataset is scheduled for refresh"
          ],
          correctAnswer: 0,
          explanation:
            "Certified endorsement indicates the dataset meets quality standards and is approved for use across the organization.",
          difficulty: "medium",
          tags: ["endorsement", "governance"]
        },
        {
          id: "dm-018",
          type: "multiple-choice",
          question: "What is the difference between 'Promoted' and 'Certified' dataset endorsement?",
          options: [
            "Certified requires admin approval; Promoted doesn't",
            "Promoted is higher quality than Certified",
            "They are identical",
            "Certified is only for Premium workspaces"
          ],
          correctAnswer: 0,
          explanation:
            "Promoted can be set by any dataset owner, while Certified requires approval from designated certifiers with tenant settings enabled.",
          difficulty: "medium",
          tags: ["endorsement", "governance"]
        },
        {
          id: "dm-019",
          type: "multiple-choice",
          question: "Where do you view data lineage in Power BI?",
          options: [
            "Workspace lineage view",
            "Performance Analyzer",
            "Power Query editor",
            "Model view"
          ],
          correctAnswer: 0,
          explanation:
            "Lineage view shows the flow of data from sources through datasets, reports, and dashboards in a workspace.",
          difficulty: "easy",
          tags: ["lineage", "governance"]
        },
        {
          id: "dm-020",
          type: "multiple-choice",
          question: "What does impact analysis show in Power BI?",
          options: [
            "Downstream items that would be affected by changes to a dataset or dataflow",
            "Performance metrics for visuals",
            "Row-level security rules",
            "Refresh history"
          ],
          correctAnswer: 0,
          explanation:
            "Impact analysis identifies all reports, dashboards, and other items that depend on a dataset or dataflow.",
          difficulty: "medium",
          tags: ["impact-analysis", "governance"]
        },
        {
          id: "dm-021",
          type: "multiple-choice",
          question: "Which Power BI license is required to share content with users who only view reports?",
          options: [
            "Pro or Premium Per User for creator; viewers can use free license if content is in Premium capacity",
            "Everyone needs Pro",
            "Everyone needs Premium",
            "Free license for everyone"
          ],
          correctAnswer: 0,
          explanation:
            "Content creators need Pro or PPU. If content is in Premium capacity, viewers can use free licenses. Otherwise, viewers also need Pro or PPU.",
          difficulty: "hard",
          tags: ["licensing", "sharing"]
        },
        {
          id: "dm-022",
          type: "multiple-choice",
          question: "What is the difference between sharing a report directly and distributing via an app?",
          options: [
            "Apps provide a curated experience with selected content; sharing gives direct access to workspace content",
            "Sharing is only for internal users; apps are for external users",
            "Apps require Premium; sharing doesn't",
            "There is no difference"
          ],
          correctAnswer: 0,
          explanation:
            "Apps let you package and distribute selected content with a curated experience, while sharing gives direct access to specific items.",
          difficulty: "medium",
          tags: ["apps", "sharing", "distribution"]
        },
        {
          id: "dm-023",
          type: "multiple-choice",
          question: "Where do you view refresh failure notifications?",
          options: [
            "Refresh history in dataset settings or email notifications",
            "Only in the gateway logs",
            "Performance Analyzer",
            "Model view"
          ],
          correctAnswer: 0,
          explanation:
            "Refresh failures appear in dataset refresh history and can trigger email notifications to dataset owners.",
          difficulty: "easy",
          tags: ["refresh", "troubleshooting"]
        },
        {
          id: "dm-024",
          type: "multiple-choice",
          question: "What is query caching in DirectQuery mode?",
          options: [
            "Power BI temporarily stores query results to improve performance for repeated queries",
            "Queries are never cached in DirectQuery",
            "The data source caches all queries",
            "Only measure calculations are cached"
          ],
          correctAnswer: 0,
          explanation:
            "Query caching stores DirectQuery results temporarily in Power BI to improve performance when the same query is run multiple times.",
          difficulty: "medium",
          tags: ["directquery", "performance", "caching"]
        },
        {
          id: "dm-025",
          type: "multiple-choice",
          question: "What is the primary benefit of Large semantic model storage format?",
          options: [
            "Reduces model size and improves compression for large datasets",
            "Increases query speed for all models",
            "Enables DirectQuery mode",
            "Allows unlimited relationships"
          ],
          correctAnswer: 0,
          explanation:
            "Large model storage format uses enhanced compression, allowing models to grow beyond standard size limits (10GB+ in Premium).",
          difficulty: "hard",
          tags: ["performance", "optimization", "premium"]
        },
        {
          id: "dm-026",
          type: "multiple-select",
          question: "Which workspace roles can publish content to a workspace? (Select all that apply)",
          options: [
            "Admin",
            "Member",
            "Contributor",
            "Viewer"
          ],
          correctAnswers: [0, 1, 2],
          explanation:
            "Admin, Member, and Contributor roles can publish content. Viewers can only view and interact with content.",
          difficulty: "easy",
          tags: ["workspaces", "security", "roles"]
        },
        {
          id: "dm-027",
          type: "true-false",
          question: "Usage metrics reports show who has viewed a report and how often.",
          correctAnswer: true,
          explanation:
            "Usage metrics provide insights into report views, viewers, view counts, and access methods.",
          difficulty: "easy",
          tags: ["usage-metrics", "monitoring"]
        },
        {
          id: "dm-028",
          type: "multiple-choice",
          question: "What happens when you publish a report to the web?",
          options: [
            "The report becomes publicly accessible to anyone with the link, without authentication",
            "Only people in your organization can view it",
            "RLS is enforced for all viewers",
            "The report is copied to a public workspace"
          ],
          correctAnswer: 0,
          explanation:
            "Publish to web makes reports publicly accessible without authentication. Use caution with sensitive data.",
          difficulty: "medium",
          tags: ["sharing", "security", "publish-to-web"]
        },
        {
          id: "dm-029",
          type: "multiple-choice",
          question: "What is required to use automatic aggregations?",
          options: [
            "Composite model with Import and DirectQuery tables",
            "All tables in Import mode",
            "All tables in DirectQuery mode",
            "Power Query only"
          ],
          correctAnswer: 0,
          explanation:
            "Automatic aggregations require a composite model combining Import (for aggregated data) and DirectQuery (for detailed data) to optimize query performance.",
          difficulty: "hard",
          tags: ["aggregations", "performance", "composite-models"]
        },
        {
          id: "dm-030",
          type: "multiple-choice",
          question: "Which capacity SKU is required for deployment pipelines?",
          options: [
            "Premium or Fabric capacity",
            "Pro only",
            "Available in all licenses",
            "Premium Per User only"
          ],
          correctAnswer: 0,
          explanation:
            "Deployment pipelines require Premium capacity, Embedded capacity (A4 or higher), or Fabric capacity.",
          difficulty: "medium",
          tags: ["deployment", "pipelines", "licensing"]
        }
      ],
    },
  ],
  caseStudy: {
    title: "Build a Complete Gym Performance Analytics Dashboard",
    description: "A comprehensive, hands-on project that takes you through the entire Power BI workflow using real gym workout data.",
    scenario: "You're a fitness analyst tasked with building a performance dashboard to track workout progress, identify trends, and provide insights for training optimization. You have workout data from multiple sources that needs to be consolidated, cleaned, modeled, and visualized.",
    estimatedTime: "4-6 hours",
    prerequisites: [
      "Power BI Desktop installed (latest version)",
      "Basic understanding of fitness/gym terminology (sets, reps, exercises)",
      "Access to download the provided data files (3 CSV files in ZIP format)"
    ],
    dataFiles: [
      {
        name: "workout_sets.csv",
        description: "Core workout data - individual sets with date, exercise, weight, reps, and metadata.",
        downloadUrl: "/api/certifications/pl-300/data-export"
      },
      {
        name: "dim_exercises.csv",
        description: "Exercise catalog dimension table with body part mappings.",
        downloadUrl: "/api/certifications/pl-300/data-export"
      },
      {
        name: "dim_body_parts.csv",
        description: "Body part dimension table with muscle group reference data.",
        downloadUrl: "/api/certifications/pl-300/data-export"
      }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Connect to CSV Data Source",
        description: "Import workout_sets.csv using the Text/CSV connector in Power BI Desktop. Configure data type detection and examine column quality.",
        expectedOutcome: "You should see the workout_sets query in Power Query Editor with columns: id, date, exercise, weight, reps, set_number, timestamp, day_tag, is_unilateral, equipment.",
        validation: "Check the status bar - should show row count (likely 1000+). Verify 'date' is Date type and 'weight'/'reps' are Whole Number type."
      },
      {
        stepNumber: 2,
        title: "Profile and Clean the CSV Data",
        description: "Enable Column quality, Column distribution, and Column profile (based on entire dataset). Remove any rows with errors or nulls in critical fields (date, exercise, weight, reps). Check for duplicate sets.",
        expectedOutcome: "Data quality indicators show valid/error/empty percentages. Critical columns should show 100% valid. Column profile reveals data distributions.",
        validation: "View > Column quality/distribution/profile should all be enabled. Check the quality bar above each column - aim for no errors in date/exercise/weight/reps."
      },
      {
        stepNumber: 3,
        title: "Transform and Enrich CSV Data",
        description: "Add custom columns: 'volume' (weight * reps), 'estimated_1rm' (weight * (1 + reps/30)). Extract 'year', 'month', 'day_of_week' from the date column. Set appropriate data types for new columns.",
        expectedOutcome: "New calculated columns appear with correct formulas. Date-based columns show proper formatting.",
        validation: "Sort by volume descending - highest values should be heavy, high-rep sets. Check that day_of_week shows day names, not numbers."
      },
      {
        stepNumber: 4,
        title: "Import Exercise Dimension Data",
        description: "Import dim_exercises.csv using the Text/CSV connector. This contains the exercise catalog with body part mappings. Review the data structure and column types.",
        expectedOutcome: "dim_exercises query appears with columns: id, exercise_name, body_part_key, is_active.",
        validation: "Exercise names should match those in workout_sets. Body_part_key values should be text (e.g., 'chest', 'back', 'quads')."
      },
      {
        stepNumber: 5,
        title: "Import Body Parts Dimension Data",
        description: "Import dim_body_parts.csv using the Text/CSV connector. This is the reference table for muscle groups. Verify data quality and structure.",
        expectedOutcome: "dim_body_parts query appears with columns: body_part_key, body_part_label.",
        validation: "Should see entries like 'chest', 'back', 'quads', 'hamstrings', etc. Keys should match those in dim_exercises."
      },
      {
        stepNumber: 6,
        title: "Merge Queries - Add Body Part Context",
        description: "Merge workout_sets with dim_exercises on exercise name using a Left Outer join. Then merge the result with dim_body_parts on body_part_key. Expand both merges to include body_part_key and body_part_label.",
        expectedOutcome: "workout_sets query now includes body_part_key and body_part_label columns showing which muscle group each exercise targets.",
        validation: "Exercises like 'Bench Press' should show 'chest', 'Squat' should show 'quads'. Check for null body parts - indicates unmatched exercises."
      },
      {
        stepNumber: 7,
        title: "Create Date Table",
        description: "Create a new Date table using DAX (CALENDAR or CALENDARAUTO). Add calculated columns for Year, Quarter, Month, MonthName, WeekNum, DayOfWeek. Mark this as a Date table in Model view.",
        expectedOutcome: "A Date dimension table with continuous dates covering your workout date range, plus all date hierarchy columns.",
        validation: "Table Tools > Mark as date table should succeed without errors. Date range should span from earliest to latest workout date."
      },
      {
        stepNumber: 8,
        title: "Build the Data Model Relationships",
        description: "In Model view, create relationships: workout_sets[date] to Date[Date] (many-to-one), workout_sets[exercise] to dim_exercises[exercise_name] (many-to-one), dim_exercises[body_part_key] to dim_body_parts[body_part_key] (many-to-one). Set all to Single direction except where bi-directional is needed.",
        expectedOutcome: "Star schema with workout_sets as fact table, Date, dim_exercises, and dim_body_parts as dimension tables. Relationship lines connect the tables.",
        validation: "All relationships should show '1' on dimension side and '*' on fact side. No broken (dotted) relationship lines."
      },
      {
        stepNumber: 9,
        title: "Create DAX Measures for Key Metrics",
        description: "Create measures: Total Volume = SUM([volume]), Avg Weight = AVERAGE([weight]), Total Sets = COUNTROWS(workout_sets), Estimated Max 1RM = MAX([estimated_1rm]), Total Workouts = DISTINCTCOUNT([date]).",
        expectedOutcome: "Five new measures appear in the Fields pane under workout_sets table with proper aggregation logic.",
        validation: "Create a card visual with each measure - values should be reasonable (Total Volume in thousands, Total Sets in hundreds, etc.)."
      },
      {
        stepNumber: 10,
        title: "Build Volume Trend Line Chart",
        description: "Create a Line chart with Date[Date] on X-axis and Total Volume on Y-axis. Add a trend line. Configure date hierarchy to show by Month or Week.",
        expectedOutcome: "Line chart showing volume trends over time with clear upward/downward patterns.",
        validation: "Chart should show multiple data points across time. Trend line should be visible. Hovering over points shows date and volume values."
      },
      {
        stepNumber: 11,
        title: "Build Exercise Performance Matrix",
        description: "Create a Matrix visual with dim_exercises[exercise_name] on Rows, Date[Year] and Date[Month] on Columns, and Total Volume in Values. Apply conditional formatting (Data bars or Color scale) to volume values.",
        expectedOutcome: "Matrix showing exercises as rows, months as columns, with volume values color-coded by intensity.",
        validation: "Expand/collapse hierarchy works. Color gradient clearly shows high vs low volume periods. Right-click column headers to verify drill-down capability."
      },
      {
        stepNumber: 12,
        title: "Create Body Part Distribution Donut Chart",
        description: "Create a Donut chart with dim_body_parts[body_part_label] as Legend and Total Sets as Values. Format with percentage labels and meaningful colors.",
        expectedOutcome: "Donut chart showing proportion of training volume across different muscle groups.",
        validation: "All body parts should be represented. Percentages should sum to 100%. Chart legend is readable and colors are distinct."
      },
      {
        stepNumber: 13,
        title: "Build Top Exercises Bar Chart with Dynamic TopN",
        description: "Create a Bar chart showing top 10 exercises by Total Volume. Add a slicer or parameter to allow users to change the TopN value (5, 10, 15, 20).",
        expectedOutcome: "Horizontal bar chart with exercises ranked by volume. Dynamic filter allows changing how many exercises are displayed.",
        validation: "Adjusting the TopN slicer should change the number of bars shown. Bars should be sorted descending by volume."
      },
      {
        stepNumber: 14,
        title: "Add Slicers for Interactive Filtering",
        description: "Add slicers for Date[Year], Date[Month], dim_body_parts[body_part_label], and workout_sets[day_tag]. Configure slicer styles (dropdown, list, or tile). Test cross-filtering behavior across all visuals.",
        expectedOutcome: "Four slicers on the report page. Selecting any slicer value filters all visuals on the page.",
        validation: "Select a specific body part - all visuals should update to show only that muscle group's data. Clear filters should reset all visuals."
      },
      {
        stepNumber: 15,
        title: "Configure Drillthrough Page",
        description: "Create a new report page named 'Exercise Detail'. Add exercise_name to the drillthrough filter well. Build detail visuals: volume by date (line chart), set-by-set breakdown (table), and personal records (cards).",
        expectedOutcome: "Drillthrough page shows detailed analysis for a single exercise. Back button appears automatically.",
        validation: "From the main page, right-click any exercise in a visual > Drillthrough > Exercise Detail. Should navigate to detail page filtered to that exercise."
      },
      {
        stepNumber: 16,
        title: "Create Bookmarks for View States",
        description: "Create bookmarks for different report states: 'All Data' (no filters), 'Upper Body Focus' (chest, back, shoulders), 'Lower Body Focus' (legs, glutes), 'Last 90 Days'. Add buttons to navigate between bookmarks.",
        expectedOutcome: "Bookmark pane shows 4 saved states. Buttons on the report allow one-click switching between views.",
        validation: "Click each bookmark button - filters should apply/clear automatically. Bookmarks should remember slicer states and visual selections."
      },
      {
        stepNumber: 17,
        title: "Apply Conditional Formatting",
        description: "Add conditional formatting to the matrix: background color gradient for volume values, data bars for the exercise performance table, and icons for trending indicators (up/down/flat).",
        expectedOutcome: "Visuals now use color and symbols to highlight high/low values and trends at a glance.",
        validation: "High volume cells should be darker/more intense. Trend icons should appear next to values. Color scale should be intuitive (green=high, red=low or vice versa)."
      },
      {
        stepNumber: 18,
        title: "Design Custom Tooltip Page",
        description: "Create a tooltip report page (set page size to Tooltip). Add summary cards showing: Total Volume, Avg Weight, Total Sets, Estimated Max. Configure specific visuals to use this tooltip page.",
        expectedOutcome: "Hovering over data points in designated visuals shows the custom tooltip with detailed metrics.",
        validation: "Hover over any bar/point in configured visuals - custom tooltip appears instead of default. Tooltip shows metrics relevant to the hovered data point."
      },
      {
        stepNumber: 19,
        title: "Optimize Model Performance",
        description: "Review column data types - ensure no unnecessary Text columns (use Whole Number for numeric IDs). Remove unused columns from model. Check column cardinality and consider removing high-cardinality columns not used in visuals.",
        expectedOutcome: "Model size decreases. Report loads faster. Unnecessary columns are hidden or removed.",
        validation: "Check Model view - hidden columns should be dimmed. File size (check File > Options) should be optimized. No errors in DAX measures."
      },
      {
        stepNumber: 20,
        title: "Publish to Power BI Service",
        description: "Save the .pbix file. Publish to Power BI Service workspace. Verify the report renders correctly in the browser. Check that all interactions work in the service.",
        expectedOutcome: "Report appears in Power BI Service. All visuals, slicers, bookmarks, and drillthrough work as expected online.",
        validation: "Open published report in browser - all pages load. Test interactions (slicers, bookmarks, drillthrough) in the service. No error messages."
      },
      {
        stepNumber: 21,
        title: "Configure Row-Level Security (RLS)",
        description: "In Desktop, create an RLS role (e.g., 'UserFilter') with a DAX filter on a user-specific field (or simulate with date range). Test the role using 'View as'. Publish and assign users/groups in the service.",
        expectedOutcome: "RLS role is created and tested. When viewing as the role, data is filtered appropriately.",
        validation: "In Desktop: Modeling tab > Manage roles > View as role - data should be filtered. In Service: dataset settings show role assignments."
      },
      {
        stepNumber: 22,
        title: "Set Up Scheduled Refresh",
        description: "In Power BI Service, go to dataset Settings. Configure data source credentials (for API and any other sources). Set up a scheduled refresh (e.g., daily at 6 AM). Run a manual refresh to test.",
        expectedOutcome: "Scheduled refresh is configured. Manual refresh completes successfully with no errors.",
        validation: "Dataset settings > Refresh history shows 'Completed' status. Schedule is active and shows next refresh time."
      },
      {
        stepNumber: 23,
        title: "Create and Publish an App",
        description: "In the workspace, create an App. Configure app settings: name, description, theme color. Select which reports/dashboards to include. Define permissions and audience. Publish the app.",
        expectedOutcome: "App is published and accessible to specified users. App provides a curated experience with selected content.",
        validation: "Install the app from 'Apps' section - content loads correctly. Users without direct workspace access can view the app."
      },
      {
        stepNumber: 24,
        title: "Monitor with Usage Metrics",
        description: "Enable usage metrics for the report. Review the usage metrics report to see: view counts, unique viewers, most viewed pages, popular visuals. Identify engagement patterns.",
        expectedOutcome: "Usage metrics report is available showing report consumption data and user engagement.",
        validation: "From report menu: Metrics > View usage metrics report. Should show views, viewers, and page-level metrics. Data updates as users interact with the report."
      },
      {
        stepNumber: 25,
        title: "Implement Performance Tuning",
        description: "Use Performance Analyzer to identify slow visuals. Review DAX measures for optimization opportunities. Check query folding status in Power Query. Reduce visual count per page if needed.",
        expectedOutcome: "Performance Analyzer shows query times for each visual. Bottlenecks are identified and addressed.",
        validation: "View > Performance Analyzer > Start recording > Refresh visuals. Review timings - most visuals should load under 1 second. Query folding indicators show steps that fold."
      }
    ]
  }
}
