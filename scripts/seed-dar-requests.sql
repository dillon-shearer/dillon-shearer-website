BEGIN;

CREATE TABLE IF NOT EXISTS dar_request_notes (
  request_id UUID PRIMARY KEY REFERENCES dar_requests(id) ON DELETE CASCADE,
  notes TEXT,
  follow_up TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

TRUNCATE TABLE dar_status_events, dar_request_notes, dar_requested_datasets, dar_collaborators, dar_requests RESTART IDENTITY CASCADE;

WITH request_seed AS (
  SELECT *
  FROM json_to_recordset($seed$
  [
    {"id":"11111111-1111-4111-8111-aaaaaaaaaaa1","pi_name":"Fallon Price","pi_email":"fallon.price@alpinerow.io","pi_phone":"+1-406-555-1198","institution":"Alpine Row Institute","country":"United States","project_title":"Altitude Stroke Efficiency","data_use_proposal":"Comparing session load vs oximetry for rowers acclimating to altitude.","planned_start":"2025-11-25","planned_end":"2026-02-28","status":"IN_REVIEW","status_last_changed_at":"2025-11-08T16:20:00Z","created_at":"2025-10-30T14:05:00Z","updated_at":"2025-11-08T16:20:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"22222222-2222-4222-8222-bbbbbbbbbbb2","pi_name":"Mateo Velasquez","pi_email":"mateo.velasquez@andessport.ec","pi_phone":"+593-2-555-1744","institution":"Andes Sports Lab","country":"Ecuador","project_title":"Highland Recovery Windows","data_use_proposal":"Need workout_sessions and body_metrics to track delayed HRV rebound.","planned_start":"2025-09-10","planned_end":"2025-12-15","status":"DENIED","status_last_changed_at":"2025-09-05T15:45:00Z","created_at":"2025-08-19T09:10:00Z","updated_at":"2025-09-05T15:45:00Z","approved_at":null,"approved_by":null,"denied_at":"2025-09-05T15:45:00Z","denied_by":"compliance@dar.portal","denied_reason":"Request includes identifiable junior athlete notes.","revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"33333333-3333-4333-8333-ccccccccccc3","pi_name":"Naomi Richter","pi_email":"naomi.richter@praxisbiomech.de","pi_phone":"+49-30-555-8821","institution":"Praxis Biomech","country":"Germany","project_title":"Meet Taper Variability","data_use_proposal":"Spotting rep-level anomalies before sprint meets.","planned_start":"2025-12-05","planned_end":"2026-01-20","status":"SUBMITTED","status_last_changed_at":"2025-11-12T18:22:00Z","created_at":"2025-11-12T18:22:00Z","updated_at":"2025-11-12T18:22:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"44444444-4444-4444-8444-ddddddddddd4","pi_name":"Sakura Imamura","pi_email":"sakura.imamura@keihandata.jp","pi_phone":"+81-75-555-0044","institution":"Keihan Data Cooperative","country":"Japan","project_title":"Travel Microcycle Stress","data_use_proposal":"Aggregating neuromuscular fatigue flags for squads hopping time zones.","planned_start":"2025-10-15","planned_end":"2026-01-15","status":"IN_REVIEW","status_last_changed_at":"2025-10-24T09:30:00Z","created_at":"2025-10-06T11:40:00Z","updated_at":"2025-10-24T09:30:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"55555555-5555-4555-8555-eeeeeeeeeee5","pi_name":"Logan Duarte","pi_email":"logan.duarte@biorio.com","pi_phone":"+55-21-555-7344","institution":"BioRio Institute","country":"Brazil","project_title":"Heat Load Visual Coach","data_use_proposal":"Need all-time splits and set metrics to build coach-friendly visualizations.","planned_start":"2025-08-05","planned_end":"2025-11-10","status":"APPROVED","status_last_changed_at":"2025-08-01T13:00:00Z","created_at":"2025-07-12T08:10:00Z","updated_at":"2025-08-01T13:00:00Z","approved_at":"2025-08-01T13:00:00Z","approved_by":"iris.han@dar.portal","denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":"dar_18f5c8b64d1a4b8cbbe7429a34f0d7af","api_key_issued_at":"2025-08-04T10:00:00Z"},
    {"id":"66666666-6666-4666-8666-fffffffffff6","pi_name":"Samira Holt","pi_email":"samira.holt@midcitysports.org","pi_phone":"+1-216-555-2994","institution":"Mid City Sports Medicine","country":"United States","project_title":"Return-to-Play Dashboard","data_use_proposal":"Need aggregates and body metrics to monitor rehab load.","planned_start":"2025-06-20","planned_end":"2025-09-30","status":"APPROVED","status_last_changed_at":"2025-06-29T10:15:00Z","created_at":"2025-06-03T13:50:00Z","updated_at":"2025-06-29T10:15:00Z","approved_at":"2025-06-29T10:15:00Z","approved_by":"grant.everett@dar.portal","denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":"dar_6e2b9feea5cc4b7fbcbcd7e321a6d109","api_key_issued_at":"2025-07-01T09:30:00Z"},
    {"id":"77777777-7777-4777-8777-777777777777","pi_name":"Helena Ortiz","pi_email":"helena.ortiz@catalystclub.mx","pi_phone":"+52-55-555-6677","institution":"Catalyst Club","country":"Mexico","project_title":"Squad Comparison Board","data_use_proposal":"Need rep and split visualizations for pro versus amateur rosters.","planned_start":"2025-10-05","planned_end":"2026-01-10","status":"IN_REVIEW","status_last_changed_at":"2025-10-21T17:05:00Z","created_at":"2025-09-15T15:30:00Z","updated_at":"2025-10-21T17:05:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"88888888-8888-4888-8888-888888888888","pi_name":"Dominic Chen","pi_email":"dominic.chen@seadata.sg","pi_phone":"+65-6555-4490","institution":"SEA Data Singapore","country":"Singapore","project_title":"Aquatics Sleep Drift","data_use_proposal":"Need workout_sessions to correlate with swim sleep trackers.","planned_start":"2025-12-01","planned_end":"2026-02-15","status":"SUBMITTED","status_last_changed_at":"2025-11-05T07:55:00Z","created_at":"2025-11-05T07:55:00Z","updated_at":"2025-11-05T07:55:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"99999999-9999-4999-8999-999999999999","pi_name":"Nora Lind","pi_email":"nora.lind@stockholmstrength.se","pi_phone":"+46-8-555-9012","institution":"Stockholm Strength Clinic","country":"Sweden","project_title":"Masters Volume Monitor","data_use_proposal":"Need aggregates and body metrics to monitor masters lifters fatigue.","planned_start":"2025-06-15","planned_end":"2025-09-01","status":"APPROVED","status_last_changed_at":"2025-06-10T11:10:00Z","created_at":"2025-05-22T12:40:00Z","updated_at":"2025-06-10T11:10:00Z","approved_at":"2025-06-10T11:10:00Z","approved_by":"mila.garrison@dar.portal","denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":"dar_d3c43e88943a4c1a9a8f25ffb1e4c6cb","api_key_issued_at":"2025-06-12T08:45:00Z"},
    {"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0","pi_name":"Reed Koenig","pi_email":"reed.koenig@atlasperformance.co","pi_phone":"+1-720-555-7821","institution":"Atlas Performance Co.","country":"United States","project_title":"Meet Readiness Alerts","data_use_proposal":"Need set_metrics and workout_sessions for high school readiness alerts.","planned_start":"2025-09-05","planned_end":"2025-12-05","status":"DENIED","status_last_changed_at":"2025-08-18T14:25:00Z","created_at":"2025-07-30T10:55:00Z","updated_at":"2025-08-18T14:25:00Z","approved_at":null,"approved_by":null,"denied_at":"2025-08-18T14:25:00Z","denied_by":"compliance@dar.portal","denied_reason":"Need updated DPA attachments before review can continue.","revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0","pi_name":"Ivana Petrovic","pi_email":"ivana.petrovic@adriastrength.hr","pi_phone":"+385-1-555-0502","institution":"Adria Strength Hub","country":"Croatia","project_title":"Shoulder Load Diary","data_use_proposal":"Need workout sessions and wellness checkins for shoulder rehab.","planned_start":"2025-11-10","planned_end":"2026-02-28","status":"SUBMITTED","status_last_changed_at":"2025-09-28T09:32:00Z","created_at":"2025-09-28T09:32:00Z","updated_at":"2025-09-28T09:32:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null},
    {"id":"cccccccc-cccc-4ccc-8ccc-ccccccccccc0","pi_name":"Oluwaseun Adebayo","pi_email":"o.adebayo@lagosperformance.ng","pi_phone":"+234-1-555-6620","institution":"Lagos Performance Lab","country":"Nigeria","project_title":"Travel Cumulative Stress","data_use_proposal":"Need aggregates segmented by travel load for pro hoops.","planned_start":"2025-07-05","planned_end":"2025-10-30","status":"IN_REVIEW","status_last_changed_at":"2025-06-18T16:05:00Z","created_at":"2025-05-30T08:18:00Z","updated_at":"2025-06-18T16:05:00Z","approved_at":null,"approved_by":null,"denied_at":null,"denied_by":null,"denied_reason":null,"revoked_at":null,"revoked_by":null,"api_key_hash":null,"api_key_issued_at":null}
  ]
  $seed$) AS request_seed(
    id UUID,
    pi_name TEXT,
    pi_email TEXT,
    pi_phone TEXT,
    institution TEXT,
    country TEXT,
    project_title TEXT,
    data_use_proposal TEXT,
    planned_start DATE,
    planned_end DATE,
    status TEXT,
    status_last_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    denied_at TIMESTAMPTZ,
    denied_by TEXT,
    denied_reason TEXT,
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    api_key_hash TEXT,
    api_key_issued_at TIMESTAMPTZ
  )
)
INSERT INTO dar_requests (
  id,
  pi_name,
  pi_email,
  pi_phone,
  institution,
  country,
  project_title,
  data_use_proposal,
  planned_start,
  planned_end,
  status,
  status_last_changed_at,
  created_at,
  updated_at,
  approved_at,
  approved_by,
  denied_at,
  denied_by,
  denied_reason,
  revoked_at,
  revoked_by,
  api_key_hash,
  api_key_issued_at
)
SELECT
  id,
  pi_name,
  pi_email,
  pi_phone,
  institution,
  country,
  project_title,
  data_use_proposal,
  planned_start,
  planned_end,
  status,
  status_last_changed_at,
  created_at,
  updated_at,
  approved_at,
  approved_by,
  denied_at,
  denied_by,
  denied_reason,
  revoked_at,
  revoked_by,
  api_key_hash,
  api_key_issued_at
FROM request_seed;

INSERT INTO dar_requested_datasets (id, request_id, dataset_slug, level) VALUES
  ('20000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-aaaaaaaaaaa1','set_metrics',3),
  ('20000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-aaaaaaaaaaa1','aggregates',2),
  ('20000000-0000-4000-8000-000000000003','22222222-2222-4222-8222-bbbbbbbbbbb2','workout_sessions',2),
  ('20000000-0000-4000-8000-000000000004','22222222-2222-4222-8222-bbbbbbbbbbb2','body_metrics',1),
  ('20000000-0000-4000-8000-000000000005','33333333-3333-4333-8333-ccccccccccc3','set_metrics',1),
  ('20000000-0000-4000-8000-000000000006','44444444-4444-4444-8444-ddddddddddd4','aggregates',3),
  ('20000000-0000-4000-8000-000000000007','44444444-4444-4444-8444-ddddddddddd4','workout_sessions',2),
  ('20000000-0000-4000-8000-000000000008','55555555-5555-4555-8555-eeeeeeeeeee5','set_metrics',2),
  ('20000000-0000-4000-8000-000000000009','55555555-5555-4555-8555-eeeeeeeeeee5','aggregates',2),
  ('20000000-0000-4000-8000-00000000000a','55555555-5555-4555-8555-eeeeeeeeeee5','workout_sessions',2),
  ('20000000-0000-4000-8000-00000000000b','66666666-6666-4666-8666-fffffffffff6','body_metrics',1),
  ('20000000-0000-4000-8000-00000000000c','66666666-6666-4666-8666-fffffffffff6','aggregates',2),
  ('20000000-0000-4000-8000-00000000000d','77777777-7777-4777-8777-777777777777','set_metrics',2),
  ('20000000-0000-4000-8000-00000000000e','77777777-7777-4777-8777-777777777777','body_metrics',1),
  ('20000000-0000-4000-8000-00000000000f','88888888-8888-4888-8888-888888888888','workout_sessions',1),
  ('20000000-0000-4000-8000-000000000010','99999999-9999-4999-8999-999999999999','aggregates',3),
  ('20000000-0000-4000-8000-000000000011','99999999-9999-4999-8999-999999999999','set_metrics',3),
  ('20000000-0000-4000-8000-000000000012','99999999-9999-4999-8999-999999999999','body_metrics',2),
  ('20000000-0000-4000-8000-000000000013','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0','set_metrics',2),
  ('20000000-0000-4000-8000-000000000014','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0','workout_sessions',2),
  ('20000000-0000-4000-8000-000000000015','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0','body_metrics',1),
  ('20000000-0000-4000-8000-000000000016','cccccccc-cccc-4ccc-8ccc-ccccccccccc0','aggregates',2),
  ('20000000-0000-4000-8000-000000000017','cccccccc-cccc-4ccc-8ccc-ccccccccccc0','workout_sessions',1);

INSERT INTO dar_collaborators (id, request_id, name, email, institution) VALUES
  ('30000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-aaaaaaaaaaa1','Maya Lennox','maya.lennox@alpinerow.io','+1-406-555-1199'),
  ('30000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-aaaaaaaaaaa1','Victor Ames','victor.ames@alpinerow.io','+1-406-555-2121'),
  ('30000000-0000-4000-8000-000000000003','22222222-2222-4222-8222-bbbbbbbbbbb2','Esteban Cruz','esteban.cruz@andessport.ec','+593-2-555-1930'),
  ('30000000-0000-4000-8000-000000000004','44444444-4444-4444-8444-ddddddddddd4','Emi Noguchi','emi.noguchi@keihandata.jp','+81-75-555-0021'),
  ('30000000-0000-4000-8000-000000000005','55555555-5555-4555-8555-eeeeeeeeeee5','Marina Costa','marina.costa@biorio.com','+55-21-555-7441'),
  ('30000000-0000-4000-8000-000000000006','66666666-6666-4666-8666-fffffffffff6','Priya Das','priya.das@midcitysports.org','+1-216-555-3112'),
  ('30000000-0000-4000-8000-000000000007','77777777-7777-4777-8777-777777777777','Gabriela Nuñez','gabriela.nunez@catalystclub.mx','+52-55-555-6678'),
  ('30000000-0000-4000-8000-000000000008','88888888-8888-4888-8888-888888888888','Yong Lee','yong.lee@seadata.sg','+65-6555-4491'),
  ('30000000-0000-4000-8000-000000000009','99999999-9999-4999-8999-999999999999','Jonas Mikkelsen','jonas.mikkelsen@stockholmstrength.se','+46-8-555-9013'),
  ('30000000-0000-4000-8000-00000000000a','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0','Delaney Harper','delaney.harper@atlasperformance.co','+1-720-555-7822'),
  ('30000000-0000-4000-8000-00000000000b','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0','Tea Vukovic','tea.vukovic@adriastrength.hr','+385-1-555-0530'),
  ('30000000-0000-4000-8000-00000000000c','cccccccc-cccc-4ccc-8ccc-ccccccccccc0','Abiodun Kale','abiodun.kale@lagosperformance.ng','+234-1-555-6633');

INSERT INTO dar_status_events (id, request_id, status, description, metadata, created_at) VALUES
  ('40000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-aaaaaaaaaaa1','SUBMITTED','Fallon Price submitted the request.','{"visualizationPresets":["split-all-time","volume-all-time"],"visualizationCustomRequest":"Highlight weeks above 15k meters.","customDeliveryStatus":"pending"}','2025-10-30T14:05:00Z'),
  ('40000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-aaaaaaaaaaa1','IN_REVIEW','Request routed to Alpine lead reviewer.','{"customDeliveryStatus":"pending","visualizationCustomRequest":"Analyst assigned for travel stress overlays."}','2025-11-08T16:20:00Z'),
  ('40000000-0000-4000-8000-000000000003','22222222-2222-4222-8222-bbbbbbbbbbb2','SUBMITTED','Mateo Velasquez submitted the request.','{"visualizationPresets":["training-days-all-time"],"customDeliveryStatus":"pending"}','2025-08-19T09:10:00Z'),
  ('40000000-0000-4000-8000-000000000004','22222222-2222-4222-8222-bbbbbbbbbbb2','IN_REVIEW','Compliance reviewing junior athlete scope.','{"visualizationCustomRequest":"Need flag for HRV drift vs altitude."}','2025-08-27T10:30:00Z'),
  ('40000000-0000-4000-8000-000000000005','22222222-2222-4222-8222-bbbbbbbbbbb2','DENIED','Request denied pending redaction of notes.','{"customDeliveryStatus":"rejected"}','2025-09-05T15:45:00Z'),
  ('40000000-0000-4000-8000-000000000006','33333333-3333-4333-8333-ccccccccccc3','SUBMITTED','Naomi Richter submitted the request.','{"visualizationPresets":["rep-all-time"],"visualizationCustomRequest":"Add taper week comparison bands.","customDeliveryStatus":"pending"}','2025-11-12T18:22:00Z'),
  ('40000000-0000-4000-8000-000000000007','44444444-4444-4444-8444-ddddddddddd4','SUBMITTED','Sakura Imamura submitted the request.','{"visualizationPresets":["volume-all-time"],"customDeliveryStatus":"pending"}','2025-10-06T11:40:00Z'),
  ('40000000-0000-4000-8000-000000000008','44444444-4444-4444-8444-ddddddddddd4','IN_REVIEW','Reviewer asked for more context on travel roster.','{"visualizationCustomRequest":"Overlay red-eye flights as bands."}','2025-10-24T09:30:00Z'),
  ('40000000-0000-4000-8000-000000000009','55555555-5555-4555-8555-eeeeeeeeeee5','SUBMITTED','Logan Duarte submitted the request.','{"visualizationPresets":["split-all-time","rep-all-time"],"customDeliveryStatus":"pending"}','2025-07-12T08:10:00Z'),
  ('40000000-0000-4000-8000-00000000000a','55555555-5555-4555-8555-eeeeeeeeeee5','IN_REVIEW','Reviewing multi-team sharing details.','{"visualizationCustomRequest":"Add cooling index overlay."}','2025-07-22T15:00:00Z'),
  ('40000000-0000-4000-8000-00000000000b','55555555-5555-4555-8555-eeeeeeeeeee5','APPROVED','Request approved and package queued.','{"customDeliveryStatus":"fulfilled"}','2025-08-01T13:00:00Z'),
  ('40000000-0000-4000-8000-00000000000c','66666666-6666-4666-8666-fffffffffff6','SUBMITTED','Samira Holt submitted the request.','{"visualizationPresets":["training-days-all-time"],"customDeliveryStatus":"pending"}','2025-06-03T13:50:00Z'),
  ('40000000-0000-4000-8000-00000000000d','66666666-6666-4666-8666-fffffffffff6','IN_REVIEW','Medical privacy team reviewing notes.','{"visualizationCustomRequest":"Need alerting for regression to baseline."}','2025-06-14T10:40:00Z'),
  ('40000000-0000-4000-8000-00000000000e','66666666-6666-4666-8666-fffffffffff6','APPROVED','Approved after PHI scrub.','{"customDeliveryStatus":"fulfilled"}','2025-06-29T10:15:00Z'),
  ('40000000-0000-4000-8000-00000000000f','77777777-7777-4777-8777-777777777777','SUBMITTED','Helena Ortiz submitted the request.','{"visualizationPresets":["split-all-time","rep-all-time"],"visualizationCustomRequest":"Add overlay for pro vs amateur baselines.","customDeliveryStatus":"pending"}','2025-09-15T15:30:00Z'),
  ('40000000-0000-4000-8000-000000000010','77777777-7777-4777-8777-777777777777','IN_REVIEW','In review with visualization pod.','{"visualizationCustomRequest":"Need stacked variance bands."}','2025-10-21T17:05:00Z'),
  ('40000000-0000-4000-8000-000000000011','88888888-8888-4888-8888-888888888888','SUBMITTED','Dominic Chen submitted the request.','{"visualizationPresets":["volume-all-time"],"customDeliveryStatus":"pending"}','2025-11-05T07:55:00Z'),
  ('40000000-0000-4000-8000-000000000012','99999999-9999-4999-8999-999999999999','SUBMITTED','Nora Lind submitted the request.','{"visualizationPresets":["training-days-all-time"],"customDeliveryStatus":"pending"}','2025-05-22T12:40:00Z'),
  ('40000000-0000-4000-8000-000000000013','99999999-9999-4999-8999-999999999999','IN_REVIEW','Data engineering reviewing scope.','{"visualizationCustomRequest":"Include masters-only benchmark."}','2025-05-29T09:15:00Z'),
  ('40000000-0000-4000-8000-000000000014','99999999-9999-4999-8999-999999999999','APPROVED','Request approved and API key issued.','{"customDeliveryStatus":"fulfilled"}','2025-06-10T11:10:00Z'),
  ('40000000-0000-4000-8000-000000000015','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0','SUBMITTED','Reed Koenig submitted the request.','{"visualizationPresets":["rep-all-time"],"customDeliveryStatus":"pending"}','2025-07-30T10:55:00Z'),
  ('40000000-0000-4000-8000-000000000016','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0','IN_REVIEW','Requested clarification on high school roster consent.','{"visualizationCustomRequest":"Need meet readiness flags on timeline."}','2025-08-08T13:20:00Z'),
  ('40000000-0000-4000-8000-000000000017','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0','DENIED','Request denied until updated DPA is supplied.','{"customDeliveryStatus":"rejected"}','2025-08-18T14:25:00Z'),
  ('40000000-0000-4000-8000-000000000018','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0','SUBMITTED','Ivana Petrovic submitted the request.','{"visualizationPresets":["training-days-all-time"],"visualizationCustomRequest":"Need shoulder-friendly day type highlight.","customDeliveryStatus":"pending"}','2025-09-28T09:32:00Z'),
  ('40000000-0000-4000-8000-000000000019','cccccccc-cccc-4ccc-8ccc-ccccccccccc0','SUBMITTED','Oluwaseun Adebayo submitted the request.','{"visualizationPresets":["volume-all-time"],"customDeliveryStatus":"pending"}','2025-05-30T08:18:00Z'),
  ('40000000-0000-4000-8000-00000000001a','cccccccc-cccc-4ccc-8ccc-ccccccccccc0','IN_REVIEW','Reviewing travel segmentation details.','{"visualizationCustomRequest":"Add band for airport-to-tipoff latency."}','2025-06-18T16:05:00Z');

COMMIT;



