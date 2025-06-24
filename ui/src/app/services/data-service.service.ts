/**
 Copyright 2025 Wargaming.Net

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
**/

import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams, HttpRequest} from "@angular/common/http";
import * as path from "path-browserify";
import {environment} from "../../environments/environment";
import {map} from "rxjs";
import {IFile} from "../models/files.model";

@Injectable({
    providedIn: 'root'
})
export class DataServiceService {

    constructor(private http: HttpClient) {
    }

    getUserRole() {
        const userPath = path.join(environment.apiPrefix, environment.endpoints.getUserRolesEndpoint);
        return this.http.get<boolean | object>(userPath).pipe(map(response => response === true));
    }

    canUserDeleteFiles() {
        const url = path.join(environment.apiPrefix, environment.endpoints.canDeleteEndpoint);
        return this.http.get<boolean>(url);
    }

    canUserUploadFiles() {
        const url = path.join(environment.apiPrefix, environment.endpoints.canUploadEndpoint);
        return this.http.get<boolean>(url);
    }

    getFiles(value: string) {
        const encodedValue = value ? encodeURIComponent(value + '/') : '';
        const URL = path.join(environment.apiPrefix, environment.endpoints.getFilesEndpoint, encodedValue);
        return this.http.get<IFile[]>(URL);
    }

    searchFiles(value: string) {
        const URL = path.join(environment.apiPrefix, environment.endpoints.searchFilesEndpoint);
        let params = new HttpParams().set('pattern', value);
        return this.http.get<IFile[]>(URL, {params: params});
    }

    createFolder(folderPath: string) {
        const encodedFolderPath = encodeURIComponent(folderPath);
        const URL = path.join(environment.apiPrefix, environment.endpoints.createFolderEndpoint, encodedFolderPath);
        return this.http.post(URL, {}, {responseType: 'text'});
    }

    deleteFile(filePath: string) {
        const encodedFilePath = encodeURIComponent(filePath);
        const URL = path.join(environment.apiPrefix, environment.endpoints.deleteFileEndpoint, encodedFilePath);
        return this.http.delete(URL, {responseType: 'text'});
    }

    uploadFile(folderPath: string, file: File) {
        const encodedFolderPath = encodeURIComponent(folderPath);
        const URL = path.join(environment.apiPrefix, environment.endpoints.uploadFilesEndpoint, encodedFolderPath);
        const req = new HttpRequest('PUT', URL, file, {reportProgress: true, responseType: 'text'});
        return this.http.request(req);
    }

    getBuckets() {
        const URL = path.join(environment.apiPrefix, environment.endpoints.getBucketsEndpoint);
        return this.http.get<string[]>(URL);
    }

    selectBucket(bucket: string) {
        const URL = path.join(environment.apiPrefix, environment.endpoints.selectBucketEndpoint);
        const params = new URLSearchParams();
        params.append('bucket', bucket);

        const headers = new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded'
        });

        return this.http.post(URL, params.toString(), {withCredentials: true, headers});
    }

    deleteFolder(folderPath: string) {
        const encodedFolderPath = encodeURIComponent(folderPath);
        const URL = path.join(environment.apiPrefix, environment.endpoints.deleteFolderEndpoint, encodedFolderPath);
        return this.http.delete(URL, {responseType: 'text'});
    }

    getTextFile(filePath: string) {
        const encodedPath = encodeURIComponent(filePath);
        const URL = path.join(environment.apiPrefix, 'download', encodedPath);
        return this.http.get(URL, {responseType: 'text'});
    }
}
