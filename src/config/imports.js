import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import express from "express";
import jwt from "jsonwebtoken";
import lodash from "lodash";
import _ from 'lodash';
import * as crypto from 'crypto';
import { faker } from '@faker-js/faker';
import postgres from "pg"; const { Pool } = postgres;
import redis from "redis"; const { createClient } = redis;
import { uniqueUsernameGenerator, adjectives, nouns } from 'unique-username-generator';
import { Worker, Job, Queue } from 'bullmq';
import { createLogger, transports, format } from "winston";
import winston from "winston";
import LokiTransport from 'winston-loki';
import { v4 as uuidv4 } from 'uuid';

const PROTO_PATH = "../shared-proto/authentication/rpc_request.proto";

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const rpcRequestProto = grpc.loadPackageDefinition(packageDefinition);

export {
    createClient,
    grpc,
    rpcRequestProto,
    express,
    jwt,
    lodash,
    _,
    crypto,
    faker,
    Pool,
    uniqueUsernameGenerator, 
    adjectives,
    nouns,
    Worker,
    Job,
    Queue,
    createLogger,
    transports, 
    format,
    winston,
    LokiTransport,
    uuidv4,
};
