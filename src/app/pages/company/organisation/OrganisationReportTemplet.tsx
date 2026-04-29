import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    padding: 40,
    fontSize: 10,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 10,
  },
  logoContainer: {
    width: "25%",
    // display: "flex",
    // alignItems: "flex-start",
  },
  logo: {
    width: "120px",
    height: "100px",
  },
  titleSection: {
    width: "65%",
    textAlign: "right",
  },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    borderStyle: "solid",
    borderColor: "#000",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeader: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 6,
  },
  tableColLabel: {
    width: "35%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
  },
  tableColValue: {
    width: "65%",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
  },
  tableCellHeader: {
    fontFamily: "Helvetica-Bold",
  },
  tableCellLabel: {
    fontFamily: "Helvetica-Bold",
  },
  stampSection: {
    position: "absolute",
    bottom: 50,
    right: 60,
    width: 60,
    height: 60,
  },
  stampImage: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  thankYouNote: {
    marginTop: 50,
    // textAlign: "center",
    marginLeft: 50,
  },
});

interface OrganizationData {
  companyName: string;
  companyURL: string;
  address: {
    building?: string;
    street?: string;
    area?: string;
    city: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  numberOfEmployees?: string;
  additionalplacesofbusiness?: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    fax?: string;
  };
  registration: {
    registrationNumber?: string;
    panNumber?: string;
    gstNumber?: string;
    cinNumber?: string;
    incorporationDate?: string;
    tanNumber?: string;
    ptecCertificate?: string;
    hsnSacNo?: string;
  };
  banking: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    // branch?: string;
    beneficiaryName?: string;
    micrCode?: string;
    bankAddress?: string;
    contactPerson?: string;
    accountant?: string;
  };
  directors?: {
    name: string;
    designation: string;
    din?: string;
  }[];
  authorizedSignatory?: {
    name?: string;
    designation?: string;
  };
  logoUrl?: string;
  stampUrl?: string;
}

function OrganizationTemplate({
  organizationData,
}: {
  organizationData: OrganizationData;
}) {
  const {
    companyName,
    companyURL,
    address,
    contact,
    registration,
    banking,
    logoUrl,
    stampUrl,
  } = organizationData || {};

  const formatAddress = (addr: any) => {
    if (!addr) return "";
    const parts = [
      addr.building,
      addr.street,
      addr.area,
      addr.city,
      addr.state,
      addr.pincode,
      addr.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const renderRow = (label: any, value: any) =>
    value ? (
      <View style={styles.tableRow}>
        <View style={styles.tableColLabel}>
          <Text style={styles.tableCellLabel}>{label}</Text>
        </View>
        <View style={styles.tableColValue}>
          <Text>{value}</Text>
        </View>
      </View>
    ) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            {logoUrl && (
              <Image
                style={styles.logo}
                src={`${logoUrl}?noCache=${Math.random()}`}
              />
            )}
          </View>
          <View style={styles.titleSection}>
            {companyName && (
              <Text style={styles.companyName}>{companyName}</Text>
            )}
            <Text>{formatAddress(address)}</Text>
            <Link src={contact?.website} style={{ color: 'blue', textDecoration: 'underline' }}>
              {contact?.website}
            </Link>
          </View>
        </View>

        {/* Company Detail */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>
                Company & Registration Details
              </Text>
            </View>
          </View>
          {renderRow("Company Name", companyName)}
          {renderRow("Address", formatAddress(address))}
          {renderRow(
            "Additional Places of Business",
            organizationData?.additionalplacesofbusiness
          )}
          {renderRow("Website", contact?.website)}
          {renderRow("Incorporation Date", registration?.incorporationDate)}
          {renderRow("CIN Number", registration?.cinNumber)}
          {renderRow("GST Number", registration?.gstNumber)}
          {renderRow("PAN Number", registration?.panNumber)}
          {renderRow("TAN Number", registration?.tanNumber)}
          {renderRow("PTEC Certificate", registration?.ptecCertificate)}
          {renderRow("HSN/SAC Code", registration?.hsnSacNo)}
        </View>

        {/* Bank Details */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Bank Details</Text>
            </View>
          </View>
          {renderRow("Beneficiary Name", banking?.beneficiaryName)}
          {renderRow("Bank Address", banking?.bankAddress)}
          {renderRow("Account Number", banking?.accountNumber)}
          {renderRow("IFSC Code", banking?.ifscCode)}
          {renderRow("MICR Code", banking?.micrCode)}
        </View>

        {/* Contact Details */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Contact Details</Text>
            </View>
          </View>
          {renderRow("Email", contact?.email)}
          {renderRow("Phone", contact?.phone)}
          {renderRow("Admin / Accountant", banking?.accountant)}
        </View>

        <View style={styles.thankYouNote}>
          <Text>Thank you</Text>
          <Text>Yours sincerely</Text>
          <Text>{organizationData?.companyName}</Text>
        </View>

        {/* Stamp */}
        {stampUrl && (
          <View style={styles.stampSection}>
            <Image
              style={styles.stampImage}
              src={`${stampUrl}?noCache=${Math.random()}`}
            />
          </View>
        )}
      </Page>
    </Document>
  );
}

export default OrganizationTemplate;
