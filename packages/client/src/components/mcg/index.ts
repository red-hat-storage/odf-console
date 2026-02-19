// Reexports MCG imports from ODF core
import { CreateOBCPage } from '@odf/core/components/mcg/CreateObjectBucketClaim';
import {
  OBCDetailsPage,
  OBCListPage,
} from '@odf/core/components/mcg/ObjectBucketClaim';
import ObjectServicePage from '@odf/core/components/object-service-nav-item/object-service';
import BucketOverview from '@odf/core/components/s3-browser/bucket-overview/BucketOverview';
import BucketsListPage from '@odf/core/components/s3-browser/buckets-list-page/bucketsListPage';
import { CorsDetailsPage } from '@odf/core/components/s3-browser/cors-details/CorsDetailsPage';
import CreateBucket from '@odf/core/components/s3-browser/create-bucket/CreateBucket';
import {
  CreateCorsRule,
  EditCorsRule,
} from '@odf/core/components/s3-browser/create-or-edit-cors-rules/CreateOrEditCorsRule';
import {
  CreateLifecycleRule,
  EditLifecycleRule,
} from '@odf/core/components/s3-browser/create-or-edit-lifecycle-rules/CreateOrEditLifecycleRule';

export default ObjectServicePage;
export {
  BucketsListPage,
  BucketOverview as s3BucketOverview,
  CorsDetailsPage,
  CreateBucket,
  CreateOBCPage,
  OBCDetailsPage,
  OBCListPage,
  CreateCorsRule,
  CreateLifecycleRule,
  EditCorsRule,
  EditLifecycleRule,
};
