--
-- PostgreSQL database dump
--

\restrict 54xBML3yrP1Zntj19h1sCPnSyKLtEgc5C3smPNfe9iNBSQzkithgtxoh8CB88QW

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: whms
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO whms;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: whms
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AutomationRunStatus; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."AutomationRunStatus" AS ENUM (
    'pending',
    'running',
    'success',
    'failed'
);


ALTER TYPE public."AutomationRunStatus" OWNER TO whms;

--
-- Name: BillingCycle; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."BillingCycle" AS ENUM (
    'monthly',
    'quarterly',
    'semi_annually',
    'annually'
);


ALTER TYPE public."BillingCycle" OWNER TO whms;

--
-- Name: DomainContactType; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."DomainContactType" AS ENUM (
    'registrant',
    'admin',
    'tech',
    'billing'
);


ALTER TYPE public."DomainContactType" OWNER TO whms;

--
-- Name: DomainStatus; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."DomainStatus" AS ENUM (
    'pending_registration',
    'active',
    'expired',
    'grace',
    'redemption',
    'transfer_pending',
    'transfer_failed',
    'transferred_out',
    'cancelled'
);


ALTER TYPE public."DomainStatus" OWNER TO whms;

--
-- Name: DomainTransferStatus; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."DomainTransferStatus" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);


ALTER TYPE public."DomainTransferStatus" OWNER TO whms;

--
-- Name: IpRuleType; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."IpRuleType" AS ENUM (
    'ALLOW',
    'DENY'
);


ALTER TYPE public."IpRuleType" OWNER TO whms;

--
-- Name: MarketplaceSubmissionStatus; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."MarketplaceSubmissionStatus" AS ENUM (
    'pending_review',
    'pending_dependency_approval',
    'pending_resubmission',
    'rejected',
    'auto_rejected',
    'approved'
);


ALTER TYPE public."MarketplaceSubmissionStatus" OWNER TO whms;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: whms
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'pending',
    'active',
    'suspended',
    'terminated'
);


ALTER TYPE public."OrderStatus" OWNER TO whms;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminProfile; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."AdminProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    department text,
    "staffTitle" text,
    "restrictionJson" jsonb
);


ALTER TABLE public."AdminProfile" OWNER TO whms;

--
-- Name: ApiKey; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ApiKey" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "keyHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


ALTER TABLE public."ApiKey" OWNER TO whms;

--
-- Name: ApiKeyScope; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ApiKeyScope" (
    id text NOT NULL,
    "apiKeyId" text NOT NULL,
    scope text NOT NULL
);


ALTER TABLE public."ApiKeyScope" OWNER TO whms;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."AuditLog" (
    "userId" text,
    action text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data jsonb,
    entity text,
    "entityId" text,
    ip text,
    "userAgent" text,
    actor text NOT NULL,
    level text DEFAULT 'INFO'::text NOT NULL,
    meta jsonb,
    source text NOT NULL,
    id integer NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO whms;

--
-- Name: AuditLog_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."AuditLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AuditLog_id_seq" OWNER TO whms;

--
-- Name: AuditLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."AuditLog_id_seq" OWNED BY public."AuditLog".id;


--
-- Name: AutomationProfile; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."AutomationProfile" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    cron text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AutomationProfile" OWNER TO whms;

--
-- Name: AutomationProfile_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."AutomationProfile_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AutomationProfile_id_seq" OWNER TO whms;

--
-- Name: AutomationProfile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."AutomationProfile_id_seq" OWNED BY public."AutomationProfile".id;


--
-- Name: AutomationRun; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."AutomationRun" (
    id integer NOT NULL,
    "profileId" integer NOT NULL,
    "taskId" integer,
    result jsonb,
    "errorMessage" text,
    "startedAt" timestamp(3) without time zone,
    "finishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."AutomationRunStatus" NOT NULL
);


ALTER TABLE public."AutomationRun" OWNER TO whms;

--
-- Name: AutomationRun_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."AutomationRun_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AutomationRun_id_seq" OWNER TO whms;

--
-- Name: AutomationRun_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."AutomationRun_id_seq" OWNED BY public."AutomationRun".id;


--
-- Name: AutomationTask; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."AutomationTask" (
    id integer NOT NULL,
    "profileId" integer NOT NULL,
    "actionType" text NOT NULL,
    "actionMeta" jsonb,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AutomationTask" OWNER TO whms;

--
-- Name: AutomationTask_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."AutomationTask_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AutomationTask_id_seq" OWNER TO whms;

--
-- Name: AutomationTask_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."AutomationTask_id_seq" OWNED BY public."AutomationTask".id;


--
-- Name: Backup; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Backup" (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "storageConfigId" integer,
    "filePath" text,
    "sizeBytes" bigint,
    status text NOT NULL,
    "retentionDays" integer,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "finishedAt" timestamp(3) without time zone,
    deleted boolean DEFAULT false NOT NULL,
    "errorMessage" text
);


ALTER TABLE public."Backup" OWNER TO whms;

--
-- Name: BackupStepLog; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."BackupStepLog" (
    id text NOT NULL,
    "backupId" text NOT NULL,
    step text NOT NULL,
    meta jsonb,
    status text DEFAULT 'started'::text NOT NULL,
    message text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BackupStepLog" OWNER TO whms;

--
-- Name: BackupVersion; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."BackupVersion" (
    id text NOT NULL,
    "backupId" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "filePath" text NOT NULL,
    "sizeBytes" bigint,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BackupVersion" OWNER TO whms;

--
-- Name: ClientProfile; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ClientProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    company text,
    phone text,
    address text,
    country text,
    city text,
    postal text
);


ALTER TABLE public."ClientProfile" OWNER TO whms;

--
-- Name: DNSRecord; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."DNSRecord" (
    id integer NOT NULL,
    "domainId" integer NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    value text NOT NULL,
    ttl integer DEFAULT 3600 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "providerRecordId" text
);


ALTER TABLE public."DNSRecord" OWNER TO whms;

--
-- Name: DNSRecord_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."DNSRecord_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DNSRecord_id_seq" OWNER TO whms;

--
-- Name: DNSRecord_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."DNSRecord_id_seq" OWNED BY public."DNSRecord".id;


--
-- Name: DeveloperProfile; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."DeveloperProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "displayName" text,
    website text,
    github text,
    "payoutsEmail" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "marketplaceMeta" jsonb,
    "publicKeyPem" text,
    "storeName" text,
    "stripeAccountId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DeveloperProfile" OWNER TO whms;

--
-- Name: Domain; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Domain" (
    id integer NOT NULL,
    name text NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    nameservers text[] DEFAULT ARRAY[]::text[],
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "ownerId" text NOT NULL,
    "providerConfigId" integer,
    registrar text,
    "registrationPrice" integer,
    "renewalPrice" integer,
    status public."DomainStatus" DEFAULT 'pending_registration'::public."DomainStatus" NOT NULL
);


ALTER TABLE public."Domain" OWNER TO whms;

--
-- Name: DomainContact; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."DomainContact" (
    id integer NOT NULL,
    "domainId" integer NOT NULL,
    type public."DomainContactType" NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    country text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DomainContact" OWNER TO whms;

--
-- Name: DomainContact_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."DomainContact_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DomainContact_id_seq" OWNER TO whms;

--
-- Name: DomainContact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."DomainContact_id_seq" OWNED BY public."DomainContact".id;


--
-- Name: DomainLog; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."DomainLog" (
    id integer NOT NULL,
    "domainId" integer NOT NULL,
    action text NOT NULL,
    message text,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DomainLog" OWNER TO whms;

--
-- Name: DomainLog_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."DomainLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DomainLog_id_seq" OWNER TO whms;

--
-- Name: DomainLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."DomainLog_id_seq" OWNED BY public."DomainLog".id;


--
-- Name: DomainRegistrarCommand; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."DomainRegistrarCommand" (
    id integer NOT NULL,
    "domainId" integer NOT NULL,
    action text NOT NULL,
    request jsonb,
    response jsonb,
    success boolean NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DomainRegistrarCommand" OWNER TO whms;

--
-- Name: DomainRegistrarCommand_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."DomainRegistrarCommand_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DomainRegistrarCommand_id_seq" OWNER TO whms;

--
-- Name: DomainRegistrarCommand_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."DomainRegistrarCommand_id_seq" OWNED BY public."DomainRegistrarCommand".id;


--
-- Name: DomainTransfer; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."DomainTransfer" (
    id integer NOT NULL,
    "domainId" integer NOT NULL,
    "authCode" text NOT NULL,
    status public."DomainTransferStatus" DEFAULT 'pending'::public."DomainTransferStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "providerResponse" jsonb
);


ALTER TABLE public."DomainTransfer" OWNER TO whms;

--
-- Name: DomainTransfer_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."DomainTransfer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DomainTransfer_id_seq" OWNER TO whms;

--
-- Name: DomainTransfer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."DomainTransfer_id_seq" OWNED BY public."DomainTransfer".id;


--
-- Name: Domain_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."Domain_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Domain_id_seq" OWNER TO whms;

--
-- Name: Domain_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."Domain_id_seq" OWNED BY public."Domain".id;


--
-- Name: EmailEvent; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."EmailEvent" (
    id integer NOT NULL,
    "jobId" text,
    "eventType" text NOT NULL,
    "providerId" text,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EmailEvent" OWNER TO whms;

--
-- Name: EmailEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."EmailEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EmailEvent_id_seq" OWNER TO whms;

--
-- Name: EmailEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."EmailEvent_id_seq" OWNED BY public."EmailEvent".id;


--
-- Name: EmailJob; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."EmailJob" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "templateId" integer,
    "templateName" text,
    "toEmail" text NOT NULL,
    "toName" text,
    payload jsonb,
    status text DEFAULT 'queued'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    priority text DEFAULT 'normal'::text NOT NULL,
    provider text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailJob" OWNER TO whms;

--
-- Name: EmailTemplate; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."EmailTemplate" (
    id integer NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    "bodyHtml" text NOT NULL,
    "bodyText" text,
    language text DEFAULT 'en'::text NOT NULL,
    "isDefault" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailTemplate" OWNER TO whms;

--
-- Name: EmailTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."EmailTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."EmailTemplate_id_seq" OWNER TO whms;

--
-- Name: EmailTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."EmailTemplate_id_seq" OWNED BY public."EmailTemplate".id;


--
-- Name: EmailToken; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."EmailToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    type text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL
);


ALTER TABLE public."EmailToken" OWNER TO whms;

--
-- Name: Impersonation; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Impersonation" (
    id text NOT NULL,
    "adminId" text NOT NULL,
    "impersonatedId" text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "sessionToken" text NOT NULL,
    reason text
);


ALTER TABLE public."Impersonation" OWNER TO whms;

--
-- Name: IpAccessRule; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."IpAccessRule" (
    id integer NOT NULL,
    pattern text NOT NULL,
    type public."IpRuleType" NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."IpAccessRule" OWNER TO whms;

--
-- Name: IpAccessRule_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."IpAccessRule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."IpAccessRule_id_seq" OWNER TO whms;

--
-- Name: IpAccessRule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."IpAccessRule_id_seq" OWNED BY public."IpAccessRule".id;


--
-- Name: LoginLog; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."LoginLog" (
    id text NOT NULL,
    "userId" text,
    "userEmail" text,
    success boolean NOT NULL,
    ip text,
    "userAgent" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoginLog" OWNER TO whms;

--
-- Name: MarketplaceActiveInstance; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceActiveInstance" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text,
    "instanceId" text NOT NULL,
    "userId" text,
    "lastSeen" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceActiveInstance" OWNER TO whms;

--
-- Name: MarketplaceAnalytics; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceAnalytics" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text,
    "eventType" text NOT NULL,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceAnalytics" OWNER TO whms;

--
-- Name: MarketplaceAnalyticsAggregate; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceAnalyticsAggregate" (
    id text NOT NULL,
    "productId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    installs integer DEFAULT 0 NOT NULL,
    active integer DEFAULT 0 NOT NULL,
    crashes integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceAnalyticsAggregate" OWNER TO whms;

--
-- Name: MarketplaceBuildLog; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceBuildLog" (
    id text NOT NULL,
    "submissionId" text,
    "productId" text,
    "versionId" text,
    level text DEFAULT 'info'::text NOT NULL,
    message text NOT NULL,
    meta jsonb,
    step text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceBuildLog" OWNER TO whms;

--
-- Name: MarketplaceCategory; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceCategory" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    icon text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MarketplaceCategory" OWNER TO whms;

--
-- Name: MarketplaceCrash; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceCrash" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text,
    "userId" text,
    message text NOT NULL,
    "stackTrace" text,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceCrash" OWNER TO whms;

--
-- Name: MarketplaceDependency; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceDependency" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "dependencyId" text NOT NULL,
    "versionRange" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved boolean DEFAULT false NOT NULL
);


ALTER TABLE public."MarketplaceDependency" OWNER TO whms;

--
-- Name: MarketplaceLicenseActivation; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceLicenseActivation" (
    id text NOT NULL,
    "licenseId" text NOT NULL,
    "userAgent" text,
    host text,
    ip text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceLicenseActivation" OWNER TO whms;

--
-- Name: MarketplacePerfMetric; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplacePerfMetric" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text,
    metric text NOT NULL,
    value double precision NOT NULL,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplacePerfMetric" OWNER TO whms;

--
-- Name: MarketplaceProduct; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceProduct" (
    id text NOT NULL,
    "sellerId" text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    "shortDesc" text,
    "longDesc" text,
    "categoryId" text,
    tags text[] DEFAULT ARRAY[]::text[],
    status text DEFAULT 'draft'::text NOT NULL,
    "rejectReason" text,
    logo text,
    screenshots text[] DEFAULT ARRAY[]::text[],
    documentation text,
    "ratingAvg" double precision DEFAULT 0 NOT NULL,
    "ratingCount" integer DEFAULT 0 NOT NULL,
    "installCount" integer DEFAULT 0 NOT NULL,
    "downloadCount" integer DEFAULT 0 NOT NULL,
    "lastUpdatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "approvedAt" timestamp(3) without time zone
);


ALTER TABLE public."MarketplaceProduct" OWNER TO whms;

--
-- Name: MarketplacePurchase; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplacePurchase" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text NOT NULL,
    "licenseKey" text NOT NULL,
    subscribed boolean DEFAULT false NOT NULL,
    "activationLimit" integer DEFAULT 1 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    revoked boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplacePurchase" OWNER TO whms;

--
-- Name: MarketplaceReview; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceReview" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "userId" text NOT NULL,
    rating integer NOT NULL,
    stability integer,
    review text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceReview" OWNER TO whms;

--
-- Name: MarketplaceSubmission; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceSubmission" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text,
    "reviewerId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."MarketplaceSubmissionStatus" NOT NULL
);


ALTER TABLE public."MarketplaceSubmission" OWNER TO whms;

--
-- Name: MarketplaceVerification; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceVerification" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "versionId" text NOT NULL,
    passed boolean NOT NULL,
    issues jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceVerification" OWNER TO whms;

--
-- Name: MarketplaceVersion; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceVersion" (
    id text NOT NULL,
    "productId" text NOT NULL,
    version text NOT NULL,
    "manifestJson" jsonb NOT NULL,
    "archivePath" text NOT NULL,
    changelog text,
    "priceCents" integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone
);


ALTER TABLE public."MarketplaceVersion" OWNER TO whms;

--
-- Name: MarketplaceWebhook; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceWebhook" (
    id text NOT NULL,
    event text NOT NULL,
    payload jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceWebhook" OWNER TO whms;

--
-- Name: MarketplaceWebhookEndpoint; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."MarketplaceWebhookEndpoint" (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    url text NOT NULL,
    secret text,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketplaceWebhookEndpoint" OWNER TO whms;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "snapshotId" integer NOT NULL,
    status public."OrderStatus" DEFAULT 'pending'::public."OrderStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "nextRenewalAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "suspendedAt" timestamp(3) without time zone,
    "terminatedAt" timestamp(3) without time zone
);


ALTER TABLE public."Order" OWNER TO whms;

--
-- Name: Permission; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    key text NOT NULL,
    description text
);


ALTER TABLE public."Permission" OWNER TO whms;

--
-- Name: Plugin; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Plugin" (
    id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "installedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    folder text NOT NULL,
    "configSchema" jsonb,
    type text DEFAULT 'ui'::text
);


ALTER TABLE public."Plugin" OWNER TO whms;

--
-- Name: PluginSetting; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."PluginSetting" (
    id integer NOT NULL,
    "pluginId" text NOT NULL,
    key text NOT NULL,
    value jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PluginSetting" OWNER TO whms;

--
-- Name: PluginSetting_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."PluginSetting_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PluginSetting_id_seq" OWNER TO whms;

--
-- Name: PluginSetting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."PluginSetting_id_seq" OWNED BY public."PluginSetting".id;


--
-- Name: ProviderConfig; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ProviderConfig" (
    id integer NOT NULL,
    name text NOT NULL,
    key text,
    secret text,
    endpoint text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProviderConfig" OWNER TO whms;

--
-- Name: ProviderConfig_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."ProviderConfig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ProviderConfig_id_seq" OWNER TO whms;

--
-- Name: ProviderConfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."ProviderConfig_id_seq" OWNED BY public."ProviderConfig".id;


--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."RefreshToken" (
    id integer NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO whms;

--
-- Name: RefreshToken_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."RefreshToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RefreshToken_id_seq" OWNER TO whms;

--
-- Name: RefreshToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."RefreshToken_id_seq" OWNED BY public."RefreshToken".id;


--
-- Name: ResellerProfile; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ResellerProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "resellerCode" text NOT NULL,
    company text,
    phone text,
    address text
);


ALTER TABLE public."ResellerProfile" OWNER TO whms;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public."Role" OWNER TO whms;

--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."RolePermission" (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."RolePermission" OWNER TO whms;

--
-- Name: Service; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Service" (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    code text NOT NULL
);


ALTER TABLE public."Service" OWNER TO whms;

--
-- Name: ServicePlan; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ServicePlan" (
    id integer NOT NULL,
    "serviceId" integer NOT NULL,
    name text NOT NULL,
    summary text,
    active boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServicePlan" OWNER TO whms;

--
-- Name: ServicePlan_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."ServicePlan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ServicePlan_id_seq" OWNER TO whms;

--
-- Name: ServicePlan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."ServicePlan_id_seq" OWNED BY public."ServicePlan".id;


--
-- Name: ServicePolicy; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ServicePolicy" (
    id integer NOT NULL,
    "planId" integer NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    enforced boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServicePolicy" OWNER TO whms;

--
-- Name: ServicePolicy_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."ServicePolicy_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ServicePolicy_id_seq" OWNER TO whms;

--
-- Name: ServicePolicy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."ServicePolicy_id_seq" OWNED BY public."ServicePolicy".id;


--
-- Name: ServicePricing; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ServicePricing" (
    id integer NOT NULL,
    "planId" integer NOT NULL,
    cycle public."BillingCycle" NOT NULL,
    price numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServicePricing" OWNER TO whms;

--
-- Name: ServicePricing_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."ServicePricing_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ServicePricing_id_seq" OWNER TO whms;

--
-- Name: ServicePricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."ServicePricing_id_seq" OWNED BY public."ServicePricing".id;


--
-- Name: ServiceSnapshot; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."ServiceSnapshot" (
    id integer NOT NULL,
    "serviceId" integer NOT NULL,
    "planId" integer,
    snapshot jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceSnapshot" OWNER TO whms;

--
-- Name: ServiceSnapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."ServiceSnapshot_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ServiceSnapshot_id_seq" OWNER TO whms;

--
-- Name: ServiceSnapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."ServiceSnapshot_id_seq" OWNED BY public."ServiceSnapshot".id;


--
-- Name: Service_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."Service_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Service_id_seq" OWNER TO whms;

--
-- Name: Service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."Service_id_seq" OWNED BY public."Service".id;


--
-- Name: Session; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "userAgent" text,
    ip text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isImpersonation" boolean DEFAULT false NOT NULL,
    "impersonatorId" text,
    "impersonationReason" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO whms;

--
-- Name: StorageConfig; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."StorageConfig" (
    id integer NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    config jsonb NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StorageConfig" OWNER TO whms;

--
-- Name: StorageConfig_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."StorageConfig_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."StorageConfig_id_seq" OWNER TO whms;

--
-- Name: StorageConfig_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."StorageConfig_id_seq" OWNED BY public."StorageConfig".id;


--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Ticket" (
    id integer NOT NULL,
    "clientId" text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    priority text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO whms;

--
-- Name: Ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."Ticket_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Ticket_id_seq" OWNER TO whms;

--
-- Name: Ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."Ticket_id_seq" OWNED BY public."Ticket".id;


--
-- Name: Tld; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Tld" (
    id integer NOT NULL,
    name text NOT NULL,
    "registerPrice" integer,
    "renewPrice" integer,
    "transferPrice" integer,
    "markupPercent" integer,
    "providerData" jsonb,
    "lastSynced" timestamp(3) without time zone,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tld" OWNER TO whms;

--
-- Name: TldPricing; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."TldPricing" (
    id integer NOT NULL,
    tld text NOT NULL,
    registration numeric(10,2) NOT NULL,
    renewal numeric(10,2) NOT NULL,
    transfer numeric(10,2) NOT NULL,
    provider text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TldPricing" OWNER TO whms;

--
-- Name: TldPricing_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."TldPricing_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TldPricing_id_seq" OWNER TO whms;

--
-- Name: TldPricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."TldPricing_id_seq" OWNED BY public."TldPricing".id;


--
-- Name: Tld_id_seq; Type: SEQUENCE; Schema: public; Owner: whms
--

CREATE SEQUENCE public."Tld_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Tld_id_seq" OWNER TO whms;

--
-- Name: Tld_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: whms
--

ALTER SEQUENCE public."Tld_id_seq" OWNED BY public."Tld".id;


--
-- Name: TrustedDevice; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."TrustedDevice" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "deviceId" text NOT NULL,
    "userAgent" text,
    ip text,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL
);


ALTER TABLE public."TrustedDevice" OWNER TO whms;

--
-- Name: User; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "mfaBackupCodes" text[] DEFAULT ARRAY[]::text[],
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" text,
    "passwordHash" text NOT NULL
);


ALTER TABLE public."User" OWNER TO whms;

--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."UserRole" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleId" text NOT NULL
);


ALTER TABLE public."UserRole" OWNER TO whms;

--
-- Name: Webhook; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."Webhook" (
    id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret text NOT NULL,
    events text[],
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Webhook" OWNER TO whms;

--
-- Name: WebhookLog; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public."WebhookLog" (
    id text NOT NULL,
    "webhookId" text NOT NULL,
    event text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL,
    "httpStatus" integer,
    attempts integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WebhookLog" OWNER TO whms;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: whms
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO whms;

--
-- Name: AuditLog id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AuditLog" ALTER COLUMN id SET DEFAULT nextval('public."AuditLog_id_seq"'::regclass);


--
-- Name: AutomationProfile id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationProfile" ALTER COLUMN id SET DEFAULT nextval('public."AutomationProfile_id_seq"'::regclass);


--
-- Name: AutomationRun id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationRun" ALTER COLUMN id SET DEFAULT nextval('public."AutomationRun_id_seq"'::regclass);


--
-- Name: AutomationTask id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationTask" ALTER COLUMN id SET DEFAULT nextval('public."AutomationTask_id_seq"'::regclass);


--
-- Name: DNSRecord id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DNSRecord" ALTER COLUMN id SET DEFAULT nextval('public."DNSRecord_id_seq"'::regclass);


--
-- Name: Domain id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Domain" ALTER COLUMN id SET DEFAULT nextval('public."Domain_id_seq"'::regclass);


--
-- Name: DomainContact id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainContact" ALTER COLUMN id SET DEFAULT nextval('public."DomainContact_id_seq"'::regclass);


--
-- Name: DomainLog id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainLog" ALTER COLUMN id SET DEFAULT nextval('public."DomainLog_id_seq"'::regclass);


--
-- Name: DomainRegistrarCommand id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainRegistrarCommand" ALTER COLUMN id SET DEFAULT nextval('public."DomainRegistrarCommand_id_seq"'::regclass);


--
-- Name: DomainTransfer id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainTransfer" ALTER COLUMN id SET DEFAULT nextval('public."DomainTransfer_id_seq"'::regclass);


--
-- Name: EmailEvent id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailEvent" ALTER COLUMN id SET DEFAULT nextval('public."EmailEvent_id_seq"'::regclass);


--
-- Name: EmailTemplate id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailTemplate" ALTER COLUMN id SET DEFAULT nextval('public."EmailTemplate_id_seq"'::regclass);


--
-- Name: IpAccessRule id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."IpAccessRule" ALTER COLUMN id SET DEFAULT nextval('public."IpAccessRule_id_seq"'::regclass);


--
-- Name: PluginSetting id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."PluginSetting" ALTER COLUMN id SET DEFAULT nextval('public."PluginSetting_id_seq"'::regclass);


--
-- Name: ProviderConfig id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ProviderConfig" ALTER COLUMN id SET DEFAULT nextval('public."ProviderConfig_id_seq"'::regclass);


--
-- Name: RefreshToken id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."RefreshToken" ALTER COLUMN id SET DEFAULT nextval('public."RefreshToken_id_seq"'::regclass);


--
-- Name: Service id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Service" ALTER COLUMN id SET DEFAULT nextval('public."Service_id_seq"'::regclass);


--
-- Name: ServicePlan id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePlan" ALTER COLUMN id SET DEFAULT nextval('public."ServicePlan_id_seq"'::regclass);


--
-- Name: ServicePolicy id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePolicy" ALTER COLUMN id SET DEFAULT nextval('public."ServicePolicy_id_seq"'::regclass);


--
-- Name: ServicePricing id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePricing" ALTER COLUMN id SET DEFAULT nextval('public."ServicePricing_id_seq"'::regclass);


--
-- Name: ServiceSnapshot id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServiceSnapshot" ALTER COLUMN id SET DEFAULT nextval('public."ServiceSnapshot_id_seq"'::regclass);


--
-- Name: StorageConfig id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."StorageConfig" ALTER COLUMN id SET DEFAULT nextval('public."StorageConfig_id_seq"'::regclass);


--
-- Name: Ticket id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Ticket" ALTER COLUMN id SET DEFAULT nextval('public."Ticket_id_seq"'::regclass);


--
-- Name: Tld id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Tld" ALTER COLUMN id SET DEFAULT nextval('public."Tld_id_seq"'::regclass);


--
-- Name: TldPricing id; Type: DEFAULT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."TldPricing" ALTER COLUMN id SET DEFAULT nextval('public."TldPricing_id_seq"'::regclass);


--
-- Data for Name: AdminProfile; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."AdminProfile" (id, "userId", department, "staffTitle", "restrictionJson") FROM stdin;
65b1b605-a632-4809-8103-7760326a85e8	b158eb60-f085-4e2d-973a-6830ef685b70	System	Super Administrator	\N
\.


--
-- Data for Name: ApiKey; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ApiKey" (id, "userId", name, "keyHash", "createdAt", revoked, "expiresAt") FROM stdin;
\.


--
-- Data for Name: ApiKeyScope; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ApiKeyScope" (id, "apiKeyId", scope) FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."AuditLog" ("userId", action, "createdAt", data, entity, "entityId", ip, "userAgent", actor, level, meta, source, id) FROM stdin;
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-27 15:51:49.349	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	system	INFO	\N	system	1
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-27 20:25:02.517	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	2
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 09:39:55.324	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	3
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 09:44:02.622	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	4
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 09:44:56.418	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	5
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 09:45:54.27	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	6
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 09:47:37.051	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	7
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 09:49:27.491	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	8
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 11:08:10.057	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	9
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 11:10:03.72	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	10
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 11:14:39.479	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	11
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 11:59:37.976	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	12
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 12:00:48.221	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	13
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 12:07:13.708	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	14
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-28 12:09:49.145	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::ffff:127.0.0.1	axios/1.13.2	system	INFO	\N	system	15
b158eb60-f085-4e2d-973a-6830ef685b70	login.success	2025-12-31 19:42:57.2	{"email": "superadmin@example.com", "reason": "login_success"}	auth	b158eb60-f085-4e2d-973a-6830ef685b70	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	system	INFO	\N	system	16
\.


--
-- Data for Name: AutomationProfile; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."AutomationProfile" (id, name, description, cron, enabled, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AutomationRun; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."AutomationRun" (id, "profileId", "taskId", result, "errorMessage", "startedAt", "finishedAt", "createdAt", status) FROM stdin;
\.


--
-- Data for Name: AutomationTask; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."AutomationTask" (id, "profileId", "actionType", "actionMeta", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Backup; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Backup" (id, name, type, "storageConfigId", "filePath", "sizeBytes", status, "retentionDays", "createdById", "createdAt", "startedAt", "finishedAt", deleted, "errorMessage") FROM stdin;
cmjufbi2200001c0mgt0m3hp2	backup-1767210190551	full	\N	\N	\N	running	30	b158eb60-f085-4e2d-973a-6830ef685b70	2025-12-31 19:43:10.634	2025-12-31 19:43:10.752	\N	f	\N
\.


--
-- Data for Name: BackupStepLog; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."BackupStepLog" (id, "backupId", step, meta, status, message, "createdAt") FROM stdin;
2ceb1e6d-d4bc-4d95-9f5f-0a4335c430de	cmjufbi2200001c0mgt0m3hp2	job_started	{}	success	\N	2025-12-31 19:43:10.768
3b177c30-b668-4201-9df5-371d3069af53	cmjufbi2200001c0mgt0m3hp2	provider_ready	{"provider": "local"}	success	\N	2025-12-31 19:43:10.783
05620393-cdfd-4db1-8c9c-09e6307bb222	cmjufbi2200001c0mgt0m3hp2	db_dump_started	{}	started	\N	2025-12-31 19:43:10.796
\.


--
-- Data for Name: BackupVersion; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."BackupVersion" (id, "backupId", version, "filePath", "sizeBytes", "createdAt") FROM stdin;
\.


--
-- Data for Name: ClientProfile; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ClientProfile" (id, "userId", company, phone, address, country, city, postal) FROM stdin;
\.


--
-- Data for Name: DNSRecord; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."DNSRecord" (id, "domainId", type, name, value, ttl, "createdAt", "updatedAt", "providerRecordId") FROM stdin;
4	16	A	@	1.1.1.1	300	2025-12-27 12:18:11.275	2025-12-27 12:18:11.275	\N
\.


--
-- Data for Name: DeveloperProfile; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."DeveloperProfile" (id, "userId", "displayName", website, github, "payoutsEmail", "createdAt", "marketplaceMeta", "publicKeyPem", "storeName", "stripeAccountId", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Domain; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Domain" (id, name, "expiryDate", nameservers, metadata, "createdAt", "updatedAt", "autoRenew", currency, "ownerId", "providerConfigId", registrar, "registrationPrice", "renewalPrice", status) FROM stdin;
16	available-domain-123.com	2026-12-27 12:18:11.383	{}	\N	2025-12-27 12:18:11.168	2025-12-27 12:18:11.383	f	USD	93320cb8-aa50-45fa-b3a3-610d684f1025	\N	mock	10	12	active
\.


--
-- Data for Name: DomainContact; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."DomainContact" (id, "domainId", type, name, email, phone, country, "createdAt") FROM stdin;
17	16	registrant	John Doe	john@example.com	+1	US	2025-12-27 12:18:11.182
18	16	admin	Admin User	admin@example.com	+1	US	2025-12-27 12:18:11.182
\.


--
-- Data for Name: DomainLog; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."DomainLog" (id, "domainId", action, message, meta, "createdAt") FROM stdin;
36	16	domain_availability_checked	\N	{"price": 10, "registrar": "mock"}	2025-12-27 12:18:11.197
37	16	domain_invoiced	\N	{"amount": 10, "currency": "USD", "invoiceId": "inv_1766837891167"}	2025-12-27 12:18:11.212
38	16	domain_registered	\N	{"years": 1, "registrar": "mock", "expiryDate": "2026-12-27T12:18:11.167Z"}	2025-12-27 12:18:11.229
39	16	domain_contacts_created	\N	{"count": 2}	2025-12-27 12:18:11.246
40	16	dns_record_added	\N	{"ttl": 300, "name": "@", "type": "A", "value": "1.1.1.1"}	2025-12-27 12:18:11.294
41	16	admin_domain_renewed	\N	{"years": 1, "amount": 12, "adminId": "b158eb60-f085-4e2d-973a-6830ef685b70", "currency": "USD", "invoiceId": "inv_1766837891317", "registrarCalled": true}	2025-12-27 12:18:11.338
42	16	admin_domain_override	\N	{"adminId": "b158eb60-f085-4e2d-973a-6830ef685b70", "changes": {"status": "active", "autoRenew": false}}	2025-12-27 12:18:11.368
43	16	domain_synced	\N	{"expiryDate": "2026-12-27T12:18:11.383Z"}	2025-12-27 12:18:11.397
\.


--
-- Data for Name: DomainRegistrarCommand; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."DomainRegistrarCommand" (id, "domainId", action, request, response, success, "createdAt") FROM stdin;
\.


--
-- Data for Name: DomainTransfer; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."DomainTransfer" (id, "domainId", "authCode", status, "requestedAt", "completedAt", "providerResponse") FROM stdin;
\.


--
-- Data for Name: EmailEvent; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."EmailEvent" (id, "jobId", "eventType", "providerId", payload, "createdAt") FROM stdin;
\.


--
-- Data for Name: EmailJob; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."EmailJob" (id, "templateId", "templateName", "toEmail", "toName", payload, status, attempts, "lastError", priority, provider, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmailTemplate; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."EmailTemplate" (id, name, subject, "bodyHtml", "bodyText", language, "isDefault", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmailToken; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."EmailToken" (id, "userId", "tokenHash", type, "createdAt", "expiresAt", used) FROM stdin;
\.


--
-- Data for Name: Impersonation; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Impersonation" (id, "adminId", "impersonatedId", "startedAt", "endedAt", "sessionToken", reason) FROM stdin;
\.


--
-- Data for Name: IpAccessRule; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."IpAccessRule" (id, pattern, type, description, active, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LoginLog; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."LoginLog" (id, "userId", "userEmail", success, ip, "userAgent", reason, "createdAt") FROM stdin;
455be15e-203b-4a90-9abf-2f0068c4ce35	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	login_success	2025-12-27 15:51:49.335
8c2ef3b5-ce10-42a0-aa61-d6bffb60d8a3	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-27 20:25:02.5
641a0249-a01f-49ba-978e-e13619ac2a11	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 09:39:55.309
405b8e9f-030c-4ab3-bc1b-84ae7ebda158	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 09:44:02.607
84ff8bad-cf0c-4430-82cc-2bf38bc78e23	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 09:44:56.404
b91e8a49-074a-4c97-9a6d-70a0d4fb477e	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 09:45:54.255
14bb14b1-1bba-4275-b9a1-fc4214500ce7	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 09:47:37.037
c0b72cad-b646-4173-a8a5-53198892ed26	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 09:49:27.477
3f0a0082-ff0b-47fb-9152-dae4a86765cc	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 11:08:10.043
47acc7b8-e1c7-41e7-a66f-916e97fa14ff	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 11:10:03.707
ac3e156a-85c1-411a-95be-7c23627be1f0	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 11:14:39.464
a2cd8c41-9c70-47aa-9d69-2cd6ad79c624	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 11:59:37.962
ea2d1315-9988-4992-9a60-cf2a323c8993	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 12:00:48.207
0174774d-75c5-4cd4-b59a-a7fa12c8e65a	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 12:07:13.693
ea9e7769-d2e7-4f2f-8038-8fa3536862be	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::ffff:127.0.0.1	axios/1.13.2	login_success	2025-12-28 12:09:49.131
04f9bc39-2d01-423f-a2eb-b55961deb2fe	b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	t	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	login_success	2025-12-31 19:42:57.184
\.


--
-- Data for Name: MarketplaceActiveInstance; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceActiveInstance" (id, "productId", "versionId", "instanceId", "userId", "lastSeen", meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceAnalytics; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceAnalytics" (id, "productId", "versionId", "eventType", meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceAnalyticsAggregate; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceAnalyticsAggregate" (id, "productId", date, installs, active, crashes, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceBuildLog; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceBuildLog" (id, "submissionId", "productId", "versionId", level, message, meta, step, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceCategory; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceCategory" (id, name, slug, icon, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceCrash; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceCrash" (id, "productId", "versionId", "userId", message, "stackTrace", meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceDependency; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceDependency" (id, "productId", "dependencyId", "versionRange", "createdAt", approved) FROM stdin;
\.


--
-- Data for Name: MarketplaceLicenseActivation; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceLicenseActivation" (id, "licenseId", "userAgent", host, ip, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplacePerfMetric; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplacePerfMetric" (id, "productId", "versionId", metric, value, meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceProduct; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceProduct" (id, "sellerId", title, slug, "shortDesc", "longDesc", "categoryId", tags, status, "rejectReason", logo, screenshots, documentation, "ratingAvg", "ratingCount", "installCount", "downloadCount", "lastUpdatedAt", "createdAt", "updatedAt", "approvedAt") FROM stdin;
\.


--
-- Data for Name: MarketplacePurchase; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplacePurchase" (id, "userId", "productId", "versionId", "licenseKey", subscribed, "activationLimit", "expiresAt", revoked, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceReview; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceReview" (id, "productId", "userId", rating, stability, review, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceSubmission; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceSubmission" (id, "productId", "versionId", "reviewerId", notes, "createdAt", status) FROM stdin;
\.


--
-- Data for Name: MarketplaceVerification; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceVerification" (id, "productId", "versionId", passed, issues, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceVersion; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceVersion" (id, "productId", version, "manifestJson", "archivePath", changelog, "priceCents", currency, "createdAt", "approvedAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceWebhook; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceWebhook" (id, event, payload, "createdAt") FROM stdin;
\.


--
-- Data for Name: MarketplaceWebhookEndpoint; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."MarketplaceWebhookEndpoint" (id, "vendorId", url, secret, enabled, "createdAt") FROM stdin;
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Order" (id, "clientId", "snapshotId", status, "createdAt", "updatedAt", "nextRenewalAt", "startedAt", "suspendedAt", "terminatedAt") FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Permission" (id, key, description) FROM stdin;
c3b2953c-f38b-45dc-87c5-d9977e8ee18a	admin.access	Access admin portal
8333d20a-6eb1-4e1a-be39-2294bafbf094	admin.manage.staff	Manage admin staff accounts
c260a2af-2260-49a3-b1fa-c08e980e5976	admin.settings.update	Update system settings
87c33b7f-8bcd-4fd1-9ae6-be2a5d61f434	client.area.access	Access client dashboard
1e7489a5-08be-4db2-9b0b-4dfbffaf3a53	billing.invoices.view	View invoices
c47d5875-8be4-46ff-af8e-5a0e9983a664	billing.invoices.pay	Pay invoices
9ea5581b-b483-45a0-bfa3-854f538ffdcf	reseller.dashboard.access	Access reseller dashboard
41d8ab29-4407-4e84-ae44-71352de039c0	developer.console.access	Access developer console
cf96eee5-810b-4112-a919-08fb31bac342	plugins.upload	Upload new plugin to marketplace
8ec565c0-4f4c-42b2-8617-7b0e6bb43bd4	plugins.update	Update existing plugin versions
\.


--
-- Data for Name: Plugin; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Plugin" (id, name, version, enabled, "installedAt", "updatedAt", "createdAt", folder, "configSchema", type) FROM stdin;
\.


--
-- Data for Name: PluginSetting; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."PluginSetting" (id, "pluginId", key, value, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProviderConfig; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ProviderConfig" (id, name, key, secret, endpoint, active, "createdAt", "updatedAt") FROM stdin;
1	porkbun	084fb40044928c5ada17312aa1c4b3cd0dfdf2bec373fa51b379a5aecd052b5b9abb615e9446bdb427a0ef75f01fbe65ca13cc8ec8f7ff2f459b687a3a3130652275633429faa811dd89abc3219ad3ff4edd28415fb829a7217d3051c56a7370	d78779657f16e2998800dbb1e0dc154542816a7deffb2c3712f730577d91ca0b17d879445f7b1ec8c08f11cead5c67a6b0ab3fdb82e8c476dcd60d2d9c967f8b3977e2d65dcbc66b15621fd1a31400106d05156325b77c6ec1807819e617dbbc	\N	t	2025-12-26 18:42:09.206	2025-12-27 12:36:25.954
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."RefreshToken" (id, token, "userId", revoked, "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ResellerProfile; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ResellerProfile" (id, "userId", "resellerCode", company, phone, address) FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Role" (id, name, description) FROM stdin;
e20f0e00-facd-4b43-9cf1-c4221a640ab5	superadmin	Full unrestricted access
797a53a7-e176-4d9e-baa9-278b05d7026f	admin	Admin access with limited control
6ea71138-6aa3-4dfc-bfaa-f6bbbdd5b2de	staff	Support/billing agent
3c4698a5-091d-407a-81e4-2a73301fd26e	client	Regular client account
08457846-886f-4a5e-87da-3542ee3831b6	reseller	Reseller portal access
d0ed675d-c4a2-4b99-8ff0-f49269959efb	developer	Marketplace developer
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."RolePermission" (id, "roleId", "permissionId") FROM stdin;
4b62eac5-99e2-4767-864b-ea90d4e305bc	e20f0e00-facd-4b43-9cf1-c4221a640ab5	c3b2953c-f38b-45dc-87c5-d9977e8ee18a
5ad420fc-d141-4e02-b5ba-2c29423bde24	e20f0e00-facd-4b43-9cf1-c4221a640ab5	8333d20a-6eb1-4e1a-be39-2294bafbf094
48191d05-a050-4a42-bec8-e3a0a82e86da	e20f0e00-facd-4b43-9cf1-c4221a640ab5	c260a2af-2260-49a3-b1fa-c08e980e5976
153a4387-8c28-40dc-8aef-4dcbbb0349d2	e20f0e00-facd-4b43-9cf1-c4221a640ab5	87c33b7f-8bcd-4fd1-9ae6-be2a5d61f434
d6ffe185-c062-4955-a7fc-589a388f08a6	e20f0e00-facd-4b43-9cf1-c4221a640ab5	1e7489a5-08be-4db2-9b0b-4dfbffaf3a53
67f73711-1320-4a1a-9692-7299513d531c	e20f0e00-facd-4b43-9cf1-c4221a640ab5	c47d5875-8be4-46ff-af8e-5a0e9983a664
e9e1c84f-d445-4a0c-9df2-3cdc7d778ce4	e20f0e00-facd-4b43-9cf1-c4221a640ab5	9ea5581b-b483-45a0-bfa3-854f538ffdcf
e79bf218-a01a-4bb9-8996-5df72d640228	e20f0e00-facd-4b43-9cf1-c4221a640ab5	41d8ab29-4407-4e84-ae44-71352de039c0
27fab9ef-bfcf-4b36-8b19-875766efe6c4	e20f0e00-facd-4b43-9cf1-c4221a640ab5	cf96eee5-810b-4112-a919-08fb31bac342
7fa5eb24-7489-4036-991f-bf4b1a02853e	e20f0e00-facd-4b43-9cf1-c4221a640ab5	8ec565c0-4f4c-42b2-8617-7b0e6bb43bd4
d7831eeb-7eeb-441a-a074-e11d798b398b	797a53a7-e176-4d9e-baa9-278b05d7026f	c3b2953c-f38b-45dc-87c5-d9977e8ee18a
84e1e346-f136-44b8-b44b-2e169f78d72d	797a53a7-e176-4d9e-baa9-278b05d7026f	1e7489a5-08be-4db2-9b0b-4dfbffaf3a53
78eaeee5-6ebf-4adb-9107-793910585619	797a53a7-e176-4d9e-baa9-278b05d7026f	c47d5875-8be4-46ff-af8e-5a0e9983a664
7b3f97b0-14a9-49a5-b038-c06ba7f0abd8	797a53a7-e176-4d9e-baa9-278b05d7026f	87c33b7f-8bcd-4fd1-9ae6-be2a5d61f434
c2edfa52-def9-4af1-baf6-a912f0cbfb20	6ea71138-6aa3-4dfc-bfaa-f6bbbdd5b2de	c3b2953c-f38b-45dc-87c5-d9977e8ee18a
5537fe10-67f4-43f3-9ecb-f3a1e2bfdb68	6ea71138-6aa3-4dfc-bfaa-f6bbbdd5b2de	1e7489a5-08be-4db2-9b0b-4dfbffaf3a53
e183668b-61b4-495a-9d49-f1d32cf817dc	3c4698a5-091d-407a-81e4-2a73301fd26e	87c33b7f-8bcd-4fd1-9ae6-be2a5d61f434
c20e3380-2f42-4e69-9688-0f37e7ec3345	3c4698a5-091d-407a-81e4-2a73301fd26e	1e7489a5-08be-4db2-9b0b-4dfbffaf3a53
824d1b81-2a38-4417-a82b-3b3c35707f6c	3c4698a5-091d-407a-81e4-2a73301fd26e	c47d5875-8be4-46ff-af8e-5a0e9983a664
8c7c745b-afb9-4716-9f91-528440c4e32e	08457846-886f-4a5e-87da-3542ee3831b6	9ea5581b-b483-45a0-bfa3-854f538ffdcf
9b8752f1-5c36-447b-b178-faac15c26a8b	08457846-886f-4a5e-87da-3542ee3831b6	1e7489a5-08be-4db2-9b0b-4dfbffaf3a53
372d0ab0-14c7-4446-8cbe-671652a7d806	08457846-886f-4a5e-87da-3542ee3831b6	c47d5875-8be4-46ff-af8e-5a0e9983a664
ed9069b2-c899-4f09-a716-5ee0d59d5dc8	d0ed675d-c4a2-4b99-8ff0-f49269959efb	41d8ab29-4407-4e84-ae44-71352de039c0
841ec405-cc57-4a8e-b1ec-e8cac83bd35d	d0ed675d-c4a2-4b99-8ff0-f49269959efb	cf96eee5-810b-4112-a919-08fb31bac342
9ea59c93-04c0-47ec-850b-f16b0ca30e50	d0ed675d-c4a2-4b99-8ff0-f49269959efb	8ec565c0-4f4c-42b2-8617-7b0e6bb43bd4
\.


--
-- Data for Name: Service; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Service" (id, name, description, active, "createdAt", "updatedAt", code) FROM stdin;
22	Shared Hosting	Linux shared hosting	f	2025-12-28 12:09:45.462	2025-12-28 12:09:45.523	shared_hosting
23	Order Test Hosting	Service for order testing	t	2025-12-28 12:09:49.175	2025-12-28 12:09:49.175	order_test_service
\.


--
-- Data for Name: ServicePlan; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ServicePlan" (id, "serviceId", name, summary, active, "position", "createdAt", "updatedAt") FROM stdin;
7	22	Basic	Basic hosting plan	t	0	2025-12-28 12:09:45.483	2025-12-28 12:09:45.483
8	23	Basic	Order test plan	t	0	2025-12-28 12:09:49.201	2025-12-28 12:09:49.201
\.


--
-- Data for Name: ServicePolicy; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ServicePolicy" (id, "planId", key, value, enforced, "createdAt") FROM stdin;
\.


--
-- Data for Name: ServicePricing; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ServicePricing" (id, "planId", cycle, price, currency, active, "createdAt", "updatedAt") FROM stdin;
7	7	monthly	9.99	USD	t	2025-12-28 12:09:45.5	2025-12-28 12:09:45.5
8	8	monthly	9.99	USD	t	2025-12-28 12:09:49.223	2025-12-28 12:09:49.223
\.


--
-- Data for Name: ServiceSnapshot; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."ServiceSnapshot" (id, "serviceId", "planId", snapshot, "createdAt") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Session" (id, "userId", token, "userAgent", ip, "createdAt", "expiresAt", "isImpersonation", "impersonatorId", "impersonationReason", "updatedAt") FROM stdin;
21a4ea4c-c704-40ea-b850-df8108ddedf9	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY4NTA3MDksImV4cCI6MTc2NzQ1NTUwOX0.wwP8Tnly-XP2_XFriL4K2rVpkoYr1B2hXN53qSQ5oQ8	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0	::1	2025-12-27 15:51:49.32	2026-01-03 15:51:49.319	f	\N	\N	2025-12-27 15:51:49.32
ce4e0db5-0726-4d88-8bbc-267e07492279	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY4NjcxMDIsImV4cCI6MTc2NzQ3MTkwMn0.r0t-yD-vf9a-7edV2TXpOcg9LaQ3ab3H9LwMpa8Gn4s	axios/1.13.2	::ffff:127.0.0.1	2025-12-27 20:25:02.483	2026-01-03 20:25:02.483	f	\N	\N	2025-12-27 20:25:02.483
517c42d5-77fe-4d4c-8842-5b1cd103cd65	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MTQ3OTUsImV4cCI6MTc2NzUxOTU5NX0.h_ugN3VTTWDnTJDQzS57HHgffgV0pL8fRlhU85Mpg1o	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 09:39:55.291	2026-01-04 09:39:55.291	f	\N	\N	2025-12-28 09:39:55.291
522497df-a9a7-458b-bcba-63432cc78dd2	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MTUwNDIsImV4cCI6MTc2NzUxOTg0Mn0.WasYKhUxL7B3KGBavnnzo-hRS8wc8P0Bjk-7rR9xeqk	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 09:44:02.593	2026-01-04 09:44:02.592	f	\N	\N	2025-12-28 09:44:02.593
155594c0-7381-4a35-a95e-6466fe16cd1b	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MTUwOTYsImV4cCI6MTc2NzUxOTg5Nn0.PRSg8wiYLGallfqVDljGRiDkGC-ZrXhwBQY3NBq3S70	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 09:44:56.39	2026-01-04 09:44:56.389	f	\N	\N	2025-12-28 09:44:56.39
900612fd-bf98-41aa-a53a-0bc460e138d1	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MTUxNTQsImV4cCI6MTc2NzUxOTk1NH0.oEBQkA4ahsh2KErkM6mLsi8TUhH6vPA3UfakWv0v4ks	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 09:45:54.241	2026-01-04 09:45:54.24	f	\N	\N	2025-12-28 09:45:54.241
3d338d66-897d-4252-b60a-dd5d470729cb	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MTUyNTcsImV4cCI6MTc2NzUyMDA1N30.UCvNAHlcWkvv-aYL4LKGl0CG68YXxnazxxli_6fwrEM	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 09:47:37.022	2026-01-04 09:47:37.022	f	\N	\N	2025-12-28 09:47:37.022
d626e0e7-afc3-426b-8fc1-81f79537cc7d	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MTUzNjcsImV4cCI6MTc2NzUyMDE2N30.lcbVctLm9ULwQY16H5IOKItq8HvsElsZU-I_DsWuZTU	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 09:49:27.463	2026-01-04 09:49:27.462	f	\N	\N	2025-12-28 09:49:27.463
bc6ed17b-3c80-4050-b7e4-5c652bb2da50	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjAwOTAsImV4cCI6MTc2NzUyNDg5MH0.PhkYWhzk9ZwO_lGjiKwgmHUjk8Oc1_azG_fQuWXcrww	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 11:08:10.029	2026-01-04 11:08:10.028	f	\N	\N	2025-12-28 11:08:10.029
1a87c735-f420-4b91-9afe-df05fbe0b7c3	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjAyMDMsImV4cCI6MTc2NzUyNTAwM30.cbrIijRsWPgWNF3QdReFht78ye-xD-7SRzDyysGCrkE	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 11:10:03.693	2026-01-04 11:10:03.692	f	\N	\N	2025-12-28 11:10:03.693
1903c245-b9fc-4a0e-a846-92d3e0f3fe61	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjA0NzksImV4cCI6MTc2NzUyNTI3OX0.bXimWcCCddckGVN5SXyAChxPYS_kG2A5KurJz6bvNKs	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 11:14:39.45	2026-01-04 11:14:39.449	f	\N	\N	2025-12-28 11:14:39.45
c4c5e515-473b-4511-96d7-df3aa866e363	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjMxNzcsImV4cCI6MTc2NzUyNzk3N30.V6DuZBullc4lC_CqOs7OQbQ6v_qyJ_HzQZ961N95-XY	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 11:59:37.947	2026-01-04 11:59:37.947	f	\N	\N	2025-12-28 11:59:37.947
4a94a37b-965e-41d7-b284-d41eabd1959f	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjMyNDgsImV4cCI6MTc2NzUyODA0OH0.tiqkFj-VPumahj32tgPLJIB8UslxIoQCSl9VT6KjFL8	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 12:00:48.193	2026-01-04 12:00:48.193	f	\N	\N	2025-12-28 12:00:48.193
2bdf14db-1c94-431b-985d-a325a4a0a62e	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjM2MzMsImV4cCI6MTc2NzUyODQzM30.DggNQRWary1gu3BvL7P9bdGbK_dCxhgBEzPLoOVFiwg	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 12:07:13.679	2026-01-04 12:07:13.679	f	\N	\N	2025-12-28 12:07:13.679
d1ec8d1f-dd80-430c-b619-ebf4b30b97cc	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjY5MjM3ODksImV4cCI6MTc2NzUyODU4OX0.YB08ZmXtLCg5ix08RQZaGmpubxwl_I2uGFAddrvcqDk	axios/1.13.2	::ffff:127.0.0.1	2025-12-28 12:09:49.117	2026-01-04 12:09:49.116	f	\N	\N	2025-12-28 12:09:49.117
4d05add3-5dc2-4f3f-af18-40cb196ad722	b158eb60-f085-4e2d-973a-6830ef685b70	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTU4ZWI2MC1mMDg1LTRlMmQtOTczYS02ODMwZWY2ODViNzAiLCJpYXQiOjE3NjcyMTAxNzcsImV4cCI6MTc2NzgxNDk3N30.3dNDi-J3PE0TzsCuNPHl-r1zXgV28BAHS2SPdZsipp8	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	::1	2025-12-31 19:42:57.169	2026-01-07 19:42:57.168	f	\N	\N	2025-12-31 19:42:57.169
\.


--
-- Data for Name: StorageConfig; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."StorageConfig" (id, name, provider, config, "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Ticket" (id, "clientId", subject, message, priority, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Tld; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Tld" (id, name, "registerPrice", "renewPrice", "transferPrice", "markupPercent", "providerData", "lastSynced", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TldPricing; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."TldPricing" (id, tld, registration, renewal, transfer, provider, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TrustedDevice; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."TrustedDevice" (id, "userId", "deviceId", "userAgent", ip, name, "createdAt", "lastUsedAt", "expiresAt", revoked) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."User" (id, email, "createdAt", "updatedAt", "emailVerified", "mfaBackupCodes", "mfaEnabled", "mfaSecret", "passwordHash") FROM stdin;
b158eb60-f085-4e2d-973a-6830ef685b70	superadmin@example.com	2025-12-26 18:42:21.824	2025-12-26 18:42:21.824	t	{}	f	\N	$2b$12$hzvN6RmAClt/YRk2wYWxweWMlipK6Es8.uWWOvVZe3KGryODaDXOy
93320cb8-aa50-45fa-b3a3-610d684f1025	testuser@example.com	2025-12-27 11:11:02.712	2025-12-27 11:11:02.712	t	{}	f	\N	test-password-hash
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."UserRole" (id, "userId", "roleId") FROM stdin;
dbe0bc30-b25e-46cc-9f94-e1c4790774a8	b158eb60-f085-4e2d-973a-6830ef685b70	e20f0e00-facd-4b43-9cf1-c4221a640ab5
\.


--
-- Data for Name: Webhook; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."Webhook" (id, name, url, secret, events, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WebhookLog; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public."WebhookLog" (id, "webhookId", event, payload, status, "httpStatus", attempts, "lastError", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: whms
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
f3cbe812-815c-4a94-94ab-539953d6db8c	0b22e8da0114278e0a2478a3b422ea4aa0eaf78a482d94bd1ec28efbb36de0a8	2025-12-26 23:40:58.147837+05	20251102133357_1	\N	\N	2025-12-26 23:40:57.322751+05	1
1245180b-468b-43db-a28a-602a1c722f4d	f778d00637262317531b181af9f7bb00afabf0039ce49d9e0eaeccda529301bd	2025-12-26 23:40:58.645374+05	20251113125544_fix_clientservice	\N	\N	2025-12-26 23:40:58.160798+05	1
1aceaa89-3195-467e-84d7-7a4e41910def	539261c0e62b19c7e760b8a3431cdf98f2e1bbb3ff7d265ebdf3ed48f5056c45	2025-12-26 23:40:59.438877+05	20251117130838_a1	\N	\N	2025-12-26 23:40:58.670389+05	1
b6520266-d95c-4183-a81a-51f67abcc0e9	a41269562fd5cb363ff2ebc64fe821eb80c9f83c1711e36d906dc8704163a8ab	2025-12-26 23:40:59.500215+05	20251117151539_fix_task_run_cascade	\N	\N	2025-12-26 23:40:59.453585+05	1
a5dea0fe-c08c-4fc8-a225-e2eec37ebb66	6d877e84b2cc9feb7982a52dedb6d9676f5f5f4cab147356956d40b82ce4cc48	2025-12-26 23:40:59.683471+05	20251118110922_plugin_system_upgrade	\N	\N	2025-12-26 23:40:59.515017+05	1
2fe30040-9e9f-4676-a417-bb5ce547520f	ed04d033c454d6dfb945872035964c182a89c02d4146787e9401f654eb8baa8e	2025-12-26 23:40:59.745255+05	20251118211942_fix_cascade_delete	\N	\N	2025-12-26 23:40:59.697995+05	1
08176ab2-9b2d-4de4-9d54-cdc1912b3c5f	87bbe3502a0427c1d07e41850f64efddc6ba1c7d612e94e51d8327079bd28114	2025-12-26 23:40:59.826711+05	20251118225417_plugin_marketplace_support	\N	\N	2025-12-26 23:40:59.759738+05	1
a3dfc554-f5a7-4450-8df3-f7df75cfef9f	7591952ba249f31243627ecc679176016d14efd15577677a82617d176d8ee040	2025-12-26 23:41:00.014905+05	20251119164909_backup	\N	\N	2025-12-26 23:40:59.841692+05	1
988be0e8-8943-4af1-a75e-5a24e9f99e3b	6a62ea7df3090b1d6d99220905e373a9f2a4bafec809a7de7ec8bf60e2dfea0b	2025-12-26 23:41:03.929824+05	20251203181037_init_auth_rbac	\N	\N	2025-12-26 23:41:00.031723+05	1
68e3edf8-d9dd-438e-9cc3-5feaa768f02f	dde6116df9de1d7a1272c0e8a5efff805dbab35f7c8d236002af337998652692	2025-12-26 23:41:04.554869+05	20251218175242_linux_init	\N	\N	2025-12-26 23:41:03.942949+05	1
92feab32-841d-4c58-9911-79ec191fbd52	80e9e8fcc6632497bc5fb5c629d323e7332ee488bfb5cb6ecaaf726967b17922	2025-12-26 23:41:51.970771+05	20251226184151_domain	\N	\N	2025-12-26 23:41:51.418606+05	1
0d05a404-bf5c-4435-bde8-7b78d31d0640	a6469d378454762a3030ba77409ef2473ebc442b9513cc649c60076243857386	2025-12-28 00:15:53.53037+05	20251227191553_add_services	\N	\N	2025-12-28 00:15:53.401298+05	1
\.


--
-- Name: AuditLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."AuditLog_id_seq"', 16, true);


--
-- Name: AutomationProfile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."AutomationProfile_id_seq"', 1, false);


--
-- Name: AutomationRun_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."AutomationRun_id_seq"', 1, false);


--
-- Name: AutomationTask_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."AutomationTask_id_seq"', 1, false);


--
-- Name: DNSRecord_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."DNSRecord_id_seq"', 4, true);


--
-- Name: DomainContact_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."DomainContact_id_seq"', 18, true);


--
-- Name: DomainLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."DomainLog_id_seq"', 43, true);


--
-- Name: DomainRegistrarCommand_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."DomainRegistrarCommand_id_seq"', 1, false);


--
-- Name: DomainTransfer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."DomainTransfer_id_seq"', 1, false);


--
-- Name: Domain_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."Domain_id_seq"', 16, true);


--
-- Name: EmailEvent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."EmailEvent_id_seq"', 1, false);


--
-- Name: EmailTemplate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."EmailTemplate_id_seq"', 1, false);


--
-- Name: IpAccessRule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."IpAccessRule_id_seq"', 1, false);


--
-- Name: PluginSetting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."PluginSetting_id_seq"', 1, false);


--
-- Name: ProviderConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."ProviderConfig_id_seq"', 2, true);


--
-- Name: RefreshToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."RefreshToken_id_seq"', 1, false);


--
-- Name: ServicePlan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."ServicePlan_id_seq"', 8, true);


--
-- Name: ServicePolicy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."ServicePolicy_id_seq"', 1, false);


--
-- Name: ServicePricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."ServicePricing_id_seq"', 8, true);


--
-- Name: ServiceSnapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."ServiceSnapshot_id_seq"', 1, false);


--
-- Name: Service_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."Service_id_seq"', 23, true);


--
-- Name: StorageConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."StorageConfig_id_seq"', 1, false);


--
-- Name: Ticket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."Ticket_id_seq"', 1, false);


--
-- Name: TldPricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."TldPricing_id_seq"', 1, false);


--
-- Name: Tld_id_seq; Type: SEQUENCE SET; Schema: public; Owner: whms
--

SELECT pg_catalog.setval('public."Tld_id_seq"', 1, false);


--
-- Name: AdminProfile AdminProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AdminProfile"
    ADD CONSTRAINT "AdminProfile_pkey" PRIMARY KEY (id);


--
-- Name: ApiKeyScope ApiKeyScope_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ApiKeyScope"
    ADD CONSTRAINT "ApiKeyScope_pkey" PRIMARY KEY (id);


--
-- Name: ApiKey ApiKey_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AutomationProfile AutomationProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationProfile"
    ADD CONSTRAINT "AutomationProfile_pkey" PRIMARY KEY (id);


--
-- Name: AutomationRun AutomationRun_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationRun"
    ADD CONSTRAINT "AutomationRun_pkey" PRIMARY KEY (id);


--
-- Name: AutomationTask AutomationTask_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationTask"
    ADD CONSTRAINT "AutomationTask_pkey" PRIMARY KEY (id);


--
-- Name: BackupStepLog BackupStepLog_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."BackupStepLog"
    ADD CONSTRAINT "BackupStepLog_pkey" PRIMARY KEY (id);


--
-- Name: BackupVersion BackupVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."BackupVersion"
    ADD CONSTRAINT "BackupVersion_pkey" PRIMARY KEY (id);


--
-- Name: Backup Backup_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Backup"
    ADD CONSTRAINT "Backup_pkey" PRIMARY KEY (id);


--
-- Name: ClientProfile ClientProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ClientProfile"
    ADD CONSTRAINT "ClientProfile_pkey" PRIMARY KEY (id);


--
-- Name: DNSRecord DNSRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DNSRecord"
    ADD CONSTRAINT "DNSRecord_pkey" PRIMARY KEY (id);


--
-- Name: DeveloperProfile DeveloperProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DeveloperProfile"
    ADD CONSTRAINT "DeveloperProfile_pkey" PRIMARY KEY (id);


--
-- Name: DomainContact DomainContact_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainContact"
    ADD CONSTRAINT "DomainContact_pkey" PRIMARY KEY (id);


--
-- Name: DomainLog DomainLog_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainLog"
    ADD CONSTRAINT "DomainLog_pkey" PRIMARY KEY (id);


--
-- Name: DomainRegistrarCommand DomainRegistrarCommand_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainRegistrarCommand"
    ADD CONSTRAINT "DomainRegistrarCommand_pkey" PRIMARY KEY (id);


--
-- Name: DomainTransfer DomainTransfer_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainTransfer"
    ADD CONSTRAINT "DomainTransfer_pkey" PRIMARY KEY (id);


--
-- Name: Domain Domain_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Domain"
    ADD CONSTRAINT "Domain_pkey" PRIMARY KEY (id);


--
-- Name: EmailEvent EmailEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailEvent"
    ADD CONSTRAINT "EmailEvent_pkey" PRIMARY KEY (id);


--
-- Name: EmailJob EmailJob_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailJob"
    ADD CONSTRAINT "EmailJob_pkey" PRIMARY KEY (id);


--
-- Name: EmailTemplate EmailTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailTemplate"
    ADD CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY (id);


--
-- Name: EmailToken EmailToken_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailToken"
    ADD CONSTRAINT "EmailToken_pkey" PRIMARY KEY (id);


--
-- Name: Impersonation Impersonation_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Impersonation"
    ADD CONSTRAINT "Impersonation_pkey" PRIMARY KEY (id);


--
-- Name: IpAccessRule IpAccessRule_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."IpAccessRule"
    ADD CONSTRAINT "IpAccessRule_pkey" PRIMARY KEY (id);


--
-- Name: LoginLog LoginLog_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."LoginLog"
    ADD CONSTRAINT "LoginLog_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceActiveInstance MarketplaceActiveInstance_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceActiveInstance"
    ADD CONSTRAINT "MarketplaceActiveInstance_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceAnalyticsAggregate MarketplaceAnalyticsAggregate_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceAnalyticsAggregate"
    ADD CONSTRAINT "MarketplaceAnalyticsAggregate_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceAnalytics MarketplaceAnalytics_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceAnalytics"
    ADD CONSTRAINT "MarketplaceAnalytics_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceBuildLog MarketplaceBuildLog_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceBuildLog"
    ADD CONSTRAINT "MarketplaceBuildLog_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceCategory MarketplaceCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceCategory"
    ADD CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceCrash MarketplaceCrash_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceCrash"
    ADD CONSTRAINT "MarketplaceCrash_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceDependency MarketplaceDependency_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceDependency"
    ADD CONSTRAINT "MarketplaceDependency_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceLicenseActivation MarketplaceLicenseActivation_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceLicenseActivation"
    ADD CONSTRAINT "MarketplaceLicenseActivation_pkey" PRIMARY KEY (id);


--
-- Name: MarketplacePerfMetric MarketplacePerfMetric_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplacePerfMetric"
    ADD CONSTRAINT "MarketplacePerfMetric_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceProduct MarketplaceProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceProduct"
    ADD CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY (id);


--
-- Name: MarketplacePurchase MarketplacePurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplacePurchase"
    ADD CONSTRAINT "MarketplacePurchase_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceReview MarketplaceReview_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceReview"
    ADD CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceSubmission MarketplaceSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceSubmission"
    ADD CONSTRAINT "MarketplaceSubmission_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceVerification MarketplaceVerification_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceVerification"
    ADD CONSTRAINT "MarketplaceVerification_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceVersion MarketplaceVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceVersion"
    ADD CONSTRAINT "MarketplaceVersion_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceWebhookEndpoint MarketplaceWebhookEndpoint_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceWebhookEndpoint"
    ADD CONSTRAINT "MarketplaceWebhookEndpoint_pkey" PRIMARY KEY (id);


--
-- Name: MarketplaceWebhook MarketplaceWebhook_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceWebhook"
    ADD CONSTRAINT "MarketplaceWebhook_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: PluginSetting PluginSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."PluginSetting"
    ADD CONSTRAINT "PluginSetting_pkey" PRIMARY KEY (id);


--
-- Name: Plugin Plugin_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Plugin"
    ADD CONSTRAINT "Plugin_pkey" PRIMARY KEY (id);


--
-- Name: ProviderConfig ProviderConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ProviderConfig"
    ADD CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: ResellerProfile ResellerProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ResellerProfile"
    ADD CONSTRAINT "ResellerProfile_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: ServicePlan ServicePlan_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePlan"
    ADD CONSTRAINT "ServicePlan_pkey" PRIMARY KEY (id);


--
-- Name: ServicePolicy ServicePolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePolicy"
    ADD CONSTRAINT "ServicePolicy_pkey" PRIMARY KEY (id);


--
-- Name: ServicePricing ServicePricing_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePricing"
    ADD CONSTRAINT "ServicePricing_pkey" PRIMARY KEY (id);


--
-- Name: ServiceSnapshot ServiceSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServiceSnapshot"
    ADD CONSTRAINT "ServiceSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: Service Service_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StorageConfig StorageConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."StorageConfig"
    ADD CONSTRAINT "StorageConfig_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: TldPricing TldPricing_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."TldPricing"
    ADD CONSTRAINT "TldPricing_pkey" PRIMARY KEY (id);


--
-- Name: Tld Tld_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Tld"
    ADD CONSTRAINT "Tld_pkey" PRIMARY KEY (id);


--
-- Name: TrustedDevice TrustedDevice_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."TrustedDevice"
    ADD CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WebhookLog WebhookLog_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."WebhookLog"
    ADD CONSTRAINT "WebhookLog_pkey" PRIMARY KEY (id);


--
-- Name: Webhook Webhook_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Webhook"
    ADD CONSTRAINT "Webhook_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AdminProfile_userId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "AdminProfile_userId_key" ON public."AdminProfile" USING btree ("userId");


--
-- Name: AutomationProfile_cron_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationProfile_cron_idx" ON public."AutomationProfile" USING btree (cron);


--
-- Name: AutomationProfile_enabled_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationProfile_enabled_idx" ON public."AutomationProfile" USING btree (enabled);


--
-- Name: AutomationProfile_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "AutomationProfile_name_key" ON public."AutomationProfile" USING btree (name);


--
-- Name: AutomationRun_createdAt_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationRun_createdAt_idx" ON public."AutomationRun" USING btree ("createdAt");


--
-- Name: AutomationRun_profileId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationRun_profileId_idx" ON public."AutomationRun" USING btree ("profileId");


--
-- Name: AutomationRun_status_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationRun_status_idx" ON public."AutomationRun" USING btree (status);


--
-- Name: AutomationRun_taskId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationRun_taskId_idx" ON public."AutomationRun" USING btree ("taskId");


--
-- Name: AutomationTask_order_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationTask_order_idx" ON public."AutomationTask" USING btree ("order");


--
-- Name: AutomationTask_profileId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "AutomationTask_profileId_idx" ON public."AutomationTask" USING btree ("profileId");


--
-- Name: ClientProfile_userId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ClientProfile_userId_key" ON public."ClientProfile" USING btree ("userId");


--
-- Name: DNSRecord_domainId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "DNSRecord_domainId_idx" ON public."DNSRecord" USING btree ("domainId");


--
-- Name: DeveloperProfile_userId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "DeveloperProfile_userId_key" ON public."DeveloperProfile" USING btree ("userId");


--
-- Name: DomainContact_domainId_type_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "DomainContact_domainId_type_key" ON public."DomainContact" USING btree ("domainId", type);


--
-- Name: DomainLog_domainId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "DomainLog_domainId_idx" ON public."DomainLog" USING btree ("domainId");


--
-- Name: DomainRegistrarCommand_action_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "DomainRegistrarCommand_action_idx" ON public."DomainRegistrarCommand" USING btree (action);


--
-- Name: DomainRegistrarCommand_domainId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "DomainRegistrarCommand_domainId_idx" ON public."DomainRegistrarCommand" USING btree ("domainId");


--
-- Name: DomainTransfer_status_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "DomainTransfer_status_idx" ON public."DomainTransfer" USING btree (status);


--
-- Name: Domain_expiryDate_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Domain_expiryDate_idx" ON public."Domain" USING btree ("expiryDate");


--
-- Name: Domain_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Domain_name_key" ON public."Domain" USING btree (name);


--
-- Name: Domain_ownerId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Domain_ownerId_idx" ON public."Domain" USING btree ("ownerId");


--
-- Name: Domain_status_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Domain_status_idx" ON public."Domain" USING btree (status);


--
-- Name: EmailEvent_jobId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "EmailEvent_jobId_idx" ON public."EmailEvent" USING btree ("jobId");


--
-- Name: EmailJob_status_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "EmailJob_status_idx" ON public."EmailJob" USING btree (status);


--
-- Name: EmailJob_templateId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "EmailJob_templateId_idx" ON public."EmailJob" USING btree ("templateId");


--
-- Name: EmailTemplate_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "EmailTemplate_name_key" ON public."EmailTemplate" USING btree (name);


--
-- Name: Impersonation_sessionToken_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Impersonation_sessionToken_key" ON public."Impersonation" USING btree ("sessionToken");


--
-- Name: IpAccessRule_pattern_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "IpAccessRule_pattern_idx" ON public."IpAccessRule" USING btree (pattern);


--
-- Name: MarketplaceActiveInstance_instanceId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceActiveInstance_instanceId_idx" ON public."MarketplaceActiveInstance" USING btree ("instanceId");


--
-- Name: MarketplaceActiveInstance_lastSeen_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceActiveInstance_lastSeen_idx" ON public."MarketplaceActiveInstance" USING btree ("lastSeen");


--
-- Name: MarketplaceActiveInstance_productId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceActiveInstance_productId_idx" ON public."MarketplaceActiveInstance" USING btree ("productId");


--
-- Name: MarketplaceAnalyticsAggregate_productId_date_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceAnalyticsAggregate_productId_date_idx" ON public."MarketplaceAnalyticsAggregate" USING btree ("productId", date);


--
-- Name: MarketplaceAnalyticsAggregate_productId_date_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "MarketplaceAnalyticsAggregate_productId_date_key" ON public."MarketplaceAnalyticsAggregate" USING btree ("productId", date);


--
-- Name: MarketplaceAnalytics_createdAt_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceAnalytics_createdAt_idx" ON public."MarketplaceAnalytics" USING btree ("createdAt");


--
-- Name: MarketplaceAnalytics_eventType_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceAnalytics_eventType_idx" ON public."MarketplaceAnalytics" USING btree ("eventType");


--
-- Name: MarketplaceAnalytics_productId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceAnalytics_productId_idx" ON public."MarketplaceAnalytics" USING btree ("productId");


--
-- Name: MarketplaceAnalytics_versionId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceAnalytics_versionId_idx" ON public."MarketplaceAnalytics" USING btree ("versionId");


--
-- Name: MarketplaceBuildLog_createdAt_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceBuildLog_createdAt_idx" ON public."MarketplaceBuildLog" USING btree ("createdAt");


--
-- Name: MarketplaceBuildLog_productId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceBuildLog_productId_idx" ON public."MarketplaceBuildLog" USING btree ("productId");


--
-- Name: MarketplaceBuildLog_submissionId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceBuildLog_submissionId_idx" ON public."MarketplaceBuildLog" USING btree ("submissionId");


--
-- Name: MarketplaceBuildLog_versionId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceBuildLog_versionId_idx" ON public."MarketplaceBuildLog" USING btree ("versionId");


--
-- Name: MarketplaceCategory_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "MarketplaceCategory_name_key" ON public."MarketplaceCategory" USING btree (name);


--
-- Name: MarketplaceCategory_slug_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON public."MarketplaceCategory" USING btree (slug);


--
-- Name: MarketplaceCrash_createdAt_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceCrash_createdAt_idx" ON public."MarketplaceCrash" USING btree ("createdAt");


--
-- Name: MarketplaceCrash_productId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceCrash_productId_idx" ON public."MarketplaceCrash" USING btree ("productId");


--
-- Name: MarketplaceCrash_versionId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceCrash_versionId_idx" ON public."MarketplaceCrash" USING btree ("versionId");


--
-- Name: MarketplacePerfMetric_createdAt_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplacePerfMetric_createdAt_idx" ON public."MarketplacePerfMetric" USING btree ("createdAt");


--
-- Name: MarketplacePerfMetric_metric_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplacePerfMetric_metric_idx" ON public."MarketplacePerfMetric" USING btree (metric);


--
-- Name: MarketplacePerfMetric_productId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplacePerfMetric_productId_idx" ON public."MarketplacePerfMetric" USING btree ("productId");


--
-- Name: MarketplaceProduct_slug_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "MarketplaceProduct_slug_key" ON public."MarketplaceProduct" USING btree (slug);


--
-- Name: MarketplacePurchase_licenseKey_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "MarketplacePurchase_licenseKey_key" ON public."MarketplacePurchase" USING btree ("licenseKey");


--
-- Name: MarketplaceWebhookEndpoint_vendorId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "MarketplaceWebhookEndpoint_vendorId_idx" ON public."MarketplaceWebhookEndpoint" USING btree ("vendorId");


--
-- Name: Order_clientId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Order_clientId_idx" ON public."Order" USING btree ("clientId");


--
-- Name: Order_nextRenewalAt_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Order_nextRenewalAt_idx" ON public."Order" USING btree ("nextRenewalAt");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Permission_key_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Permission_key_key" ON public."Permission" USING btree (key);


--
-- Name: PluginSetting_pluginId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "PluginSetting_pluginId_idx" ON public."PluginSetting" USING btree ("pluginId");


--
-- Name: PluginSetting_pluginId_key_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "PluginSetting_pluginId_key_key" ON public."PluginSetting" USING btree ("pluginId", key);


--
-- Name: ProviderConfig_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ProviderConfig_name_key" ON public."ProviderConfig" USING btree (name);


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RefreshToken_userId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "RefreshToken_userId_idx" ON public."RefreshToken" USING btree ("userId");


--
-- Name: ResellerProfile_resellerCode_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ResellerProfile_resellerCode_key" ON public."ResellerProfile" USING btree ("resellerCode");


--
-- Name: ResellerProfile_userId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ResellerProfile_userId_key" ON public."ResellerProfile" USING btree ("userId");


--
-- Name: RolePermission_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON public."RolePermission" USING btree ("roleId", "permissionId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: ServicePlan_serviceId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "ServicePlan_serviceId_idx" ON public."ServicePlan" USING btree ("serviceId");


--
-- Name: ServicePlan_serviceId_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ServicePlan_serviceId_name_key" ON public."ServicePlan" USING btree ("serviceId", name);


--
-- Name: ServicePolicy_planId_key_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ServicePolicy_planId_key_key" ON public."ServicePolicy" USING btree ("planId", key);


--
-- Name: ServicePricing_planId_cycle_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "ServicePricing_planId_cycle_key" ON public."ServicePricing" USING btree ("planId", cycle);


--
-- Name: ServicePricing_planId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "ServicePricing_planId_idx" ON public."ServicePricing" USING btree ("planId");


--
-- Name: ServiceSnapshot_serviceId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "ServiceSnapshot_serviceId_idx" ON public."ServiceSnapshot" USING btree ("serviceId");


--
-- Name: Service_active_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Service_active_idx" ON public."Service" USING btree (active);


--
-- Name: Service_code_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Service_code_key" ON public."Service" USING btree (code);


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Ticket_clientId_idx; Type: INDEX; Schema: public; Owner: whms
--

CREATE INDEX "Ticket_clientId_idx" ON public."Ticket" USING btree ("clientId");


--
-- Name: TldPricing_tld_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "TldPricing_tld_key" ON public."TldPricing" USING btree (tld);


--
-- Name: Tld_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Tld_name_key" ON public."Tld" USING btree (name);


--
-- Name: TrustedDevice_deviceId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "TrustedDevice_deviceId_key" ON public."TrustedDevice" USING btree ("deviceId");


--
-- Name: UserRole_userId_roleId_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON public."UserRole" USING btree ("userId", "roleId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Webhook_name_key; Type: INDEX; Schema: public; Owner: whms
--

CREATE UNIQUE INDEX "Webhook_name_key" ON public."Webhook" USING btree (name);


--
-- Name: AdminProfile AdminProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AdminProfile"
    ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApiKeyScope ApiKeyScope_apiKeyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ApiKeyScope"
    ADD CONSTRAINT "ApiKeyScope_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES public."ApiKey"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApiKey ApiKey_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ApiKey"
    ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AutomationRun AutomationRun_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationRun"
    ADD CONSTRAINT "AutomationRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."AutomationProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AutomationRun AutomationRun_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationRun"
    ADD CONSTRAINT "AutomationRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."AutomationTask"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AutomationTask AutomationTask_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."AutomationTask"
    ADD CONSTRAINT "AutomationTask_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."AutomationProfile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BackupStepLog BackupStepLog_backupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."BackupStepLog"
    ADD CONSTRAINT "BackupStepLog_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES public."Backup"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BackupVersion BackupVersion_backupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."BackupVersion"
    ADD CONSTRAINT "BackupVersion_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES public."Backup"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClientProfile ClientProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ClientProfile"
    ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DNSRecord DNSRecord_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DNSRecord"
    ADD CONSTRAINT "DNSRecord_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeveloperProfile DeveloperProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DeveloperProfile"
    ADD CONSTRAINT "DeveloperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DomainContact DomainContact_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainContact"
    ADD CONSTRAINT "DomainContact_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainLog DomainLog_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainLog"
    ADD CONSTRAINT "DomainLog_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainRegistrarCommand DomainRegistrarCommand_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainRegistrarCommand"
    ADD CONSTRAINT "DomainRegistrarCommand_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainTransfer DomainTransfer_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."DomainTransfer"
    ADD CONSTRAINT "DomainTransfer_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Domain Domain_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Domain"
    ADD CONSTRAINT "Domain_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Domain Domain_providerConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Domain"
    ADD CONSTRAINT "Domain_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES public."ProviderConfig"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmailJob EmailJob_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailJob"
    ADD CONSTRAINT "EmailJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."EmailTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmailToken EmailToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."EmailToken"
    ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Impersonation Impersonation_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Impersonation"
    ADD CONSTRAINT "Impersonation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Impersonation Impersonation_impersonatedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Impersonation"
    ADD CONSTRAINT "Impersonation_impersonatedId_fkey" FOREIGN KEY ("impersonatedId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LoginLog LoginLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."LoginLog"
    ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketplaceAnalytics MarketplaceAnalytics_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceAnalytics"
    ADD CONSTRAINT "MarketplaceAnalytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceAnalytics MarketplaceAnalytics_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceAnalytics"
    ADD CONSTRAINT "MarketplaceAnalytics_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."MarketplaceVersion"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketplaceDependency MarketplaceDependency_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceDependency"
    ADD CONSTRAINT "MarketplaceDependency_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceLicenseActivation MarketplaceLicenseActivation_licenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceLicenseActivation"
    ADD CONSTRAINT "MarketplaceLicenseActivation_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES public."MarketplacePurchase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceProduct MarketplaceProduct_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceProduct"
    ADD CONSTRAINT "MarketplaceProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."MarketplaceCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketplaceProduct MarketplaceProduct_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceProduct"
    ADD CONSTRAINT "MarketplaceProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public."DeveloperProfile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplacePurchase MarketplacePurchase_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplacePurchase"
    ADD CONSTRAINT "MarketplacePurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplacePurchase MarketplacePurchase_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplacePurchase"
    ADD CONSTRAINT "MarketplacePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplacePurchase MarketplacePurchase_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplacePurchase"
    ADD CONSTRAINT "MarketplacePurchase_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."MarketplaceVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceReview MarketplaceReview_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceReview"
    ADD CONSTRAINT "MarketplaceReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceReview MarketplaceReview_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceReview"
    ADD CONSTRAINT "MarketplaceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceSubmission MarketplaceSubmission_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceSubmission"
    ADD CONSTRAINT "MarketplaceSubmission_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceSubmission MarketplaceSubmission_reviewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceSubmission"
    ADD CONSTRAINT "MarketplaceSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketplaceSubmission MarketplaceSubmission_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceSubmission"
    ADD CONSTRAINT "MarketplaceSubmission_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."MarketplaceVersion"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketplaceVerification MarketplaceVerification_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceVerification"
    ADD CONSTRAINT "MarketplaceVerification_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceVerification MarketplaceVerification_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceVerification"
    ADD CONSTRAINT "MarketplaceVerification_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."MarketplaceVersion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MarketplaceVersion MarketplaceVersion_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."MarketplaceVersion"
    ADD CONSTRAINT "MarketplaceVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."MarketplaceProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_snapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public."ServiceSnapshot"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PluginSetting PluginSetting_pluginId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."PluginSetting"
    ADD CONSTRAINT "PluginSetting_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES public."Plugin"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResellerProfile ResellerProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ResellerProfile"
    ADD CONSTRAINT "ResellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServicePlan ServicePlan_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePlan"
    ADD CONSTRAINT "ServicePlan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServicePolicy ServicePolicy_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePolicy"
    ADD CONSTRAINT "ServicePolicy_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."ServicePlan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServicePricing ServicePricing_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."ServicePricing"
    ADD CONSTRAINT "ServicePricing_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."ServicePlan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrustedDevice TrustedDevice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."TrustedDevice"
    ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WebhookLog WebhookLog_webhookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: whms
--

ALTER TABLE ONLY public."WebhookLog"
    ADD CONSTRAINT "WebhookLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES public."Webhook"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: whms
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 54xBML3yrP1Zntj19h1sCPnSyKLtEgc5C3smPNfe9iNBSQzkithgtxoh8CB88QW

