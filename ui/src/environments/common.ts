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
export const settings = {
  apiPrefix: 'api',
  serviceDiscoveryUrl: '',
  beSearchDebounceInterval: 400,
  minSearchTermLength: 3,
  endpoints: {
    getFilesEndpoint: 'list',
    createFolderEndpoint: 'mkdir',
    uploadFilesEndpoint: 'upload',
    getUserRolesEndpoint: 'is_admin',
    canUploadEndpoint: 'can_upload',
    canDeleteEndpoint: 'can_delete',
    deleteFileEndpoint: 'delete',
    searchFilesEndpoint: 'search',
    getBucketsEndpoint: 'buckets',
    selectBucketEndpoint: 'bucket',
    deleteFolderEndpoint: 'deleteFolder',
  }
}
