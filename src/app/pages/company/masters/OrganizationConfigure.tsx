import {
  fetchAllOrganizationConfigurations,
  deleteOrganizationConfigurationById,
} from "@services/configurations";
import { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import OrganizationConfigureForm from "./components/OrganizationConfigureForm";
import Loader from "@app/modules/common/utils/Loader";

// Common button styles
const buttonStyles = {
  base: {
    border: "1px solid #9D4141",
    fontWeight: 500,
    color: "#9D4141",
    backgroundColor: "transparent",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    paddingLeft: "20px",
    paddingRight: "20px",
    height: "40px",
  },
  hover: {
    color: "white",
    backgroundColor: "#9D4141",
  },
};

interface OrganizationConfigItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const OrganizationConfigure = () => {
  const [loading, setLoading] = useState(false);

  // Shift configurations
  const [shifts, setShifts] = useState<OrganizationConfigItem[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<OrganizationConfigItem | null>(null);

  // Working Type configurations
  const [workingTypes, setWorkingTypes] = useState<OrganizationConfigItem[]>([]);
  const [showWorkingTypeModal, setShowWorkingTypeModal] = useState(false);
  const [editingWorkingType, setEditingWorkingType] = useState<OrganizationConfigItem | null>(null);

  // Room Block configurations
  const [roomBlocks, setRoomBlocks] = useState<OrganizationConfigItem[]>([]);
  const [showRoomBlockModal, setShowRoomBlockModal] = useState(false);
  const [editingRoomBlock, setEditingRoomBlock] = useState<OrganizationConfigItem | null>(null);

  // Modal open handlers
  const handleShiftModalOpen = () => setShowShiftModal(true);
  const handleWorkingTypeModalOpen = () => setShowWorkingTypeModal(true);
  const handleRoomBlockModalOpen = () => setShowRoomBlockModal(true);

  // Modal close handlers
  const handleShiftModalClose = () => {
    setShowShiftModal(false);
    setEditingShift(null);
  };

  const handleWorkingTypeModalClose = () => {
    setShowWorkingTypeModal(false);
    setEditingWorkingType(null);
  };

  const handleRoomBlockModalClose = () => {
    setShowRoomBlockModal(false);
    setEditingRoomBlock(null);
  };

  // Edit handlers
  const handleShiftEdit = (shift: OrganizationConfigItem) => {
    setEditingShift(shift);
    setShowShiftModal(true);
  };

  const handleWorkingTypeEdit = (workingType: OrganizationConfigItem) => {
    setEditingWorkingType(workingType);
    setShowWorkingTypeModal(true);
  };

  const handleRoomBlockEdit = (roomBlock: OrganizationConfigItem) => {
    setEditingRoomBlock(roomBlock);
    setShowRoomBlockModal(true);
  };

  // Fetch shifts
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations("SHIFT");
      if (response?.data?.organizationConfigurations) {
        setShifts(response.data.organizationConfigurations);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch working types
  const fetchWorkingTypes = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations("WORKING_TYPE");
      if (response?.data?.organizationConfigurations) {
        setWorkingTypes(response.data.organizationConfigurations);
      }
    } catch (error) {
      console.error("Error fetching working types:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch room blocks
  const fetchRoomBlocks = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations("ROOM_BLOCK");
      if (response?.data?.organizationConfigurations) {
        setRoomBlocks(response.data.organizationConfigurations);
      }
    } catch (error) {
      console.error("Error fetching room blocks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Event bus listeners
  useEventBus(EVENT_KEYS.organizationConfigCreated, () => {
    fetchShifts();
    fetchWorkingTypes();
    fetchRoomBlocks();
  });

  useEventBus(EVENT_KEYS.organizationConfigUpdated, () => {
    fetchShifts();
    fetchWorkingTypes();
    fetchRoomBlocks();
  });

  useEffect(() => {
    fetchShifts();
    fetchWorkingTypes();
    fetchRoomBlocks();
  }, []);

  // Delete handler
  const handleDelete = async (
    id: string,
    type: "SHIFT" | "WORKING_TYPE" | "ROOM_BLOCK"
  ) => {
    try {
      const confirmed = await deleteConfirmation(
        `Successfully deleted ${type.toLowerCase().replace('_', ' ')}`
      );
      if (!confirmed) return;

      await deleteOrganizationConfigurationById(id);

      // Refresh appropriate list
      switch (type) {
        case "SHIFT":
          fetchShifts();
          break;
        case "WORKING_TYPE":
          fetchWorkingTypes();
          break;
        case "ROOM_BLOCK":
          fetchRoomBlocks();
          break;
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {/* Room/Block Card */}
      <h2 style={{fontFamily:'', fontSize:''}}>Configure</h2>
      <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5
              className="card-title"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "0",
              }}
            >
              Room/Blocks
            </h5>
            <button
              onClick={handleRoomBlockModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Room/Block
            </button>
          </div>

          <div className="row mt-4">
            {roomBlocks.map((roomBlock) => (
              <div key={roomBlock.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 400,
                      fontStyle: "normal",
                      fontSize: "14px",
                      lineHeight: "100%",
                      letterSpacing: "0",
                      cursor: "pointer",
                    }}
                    title={roomBlock.name}
                  >
                    {roomBlock.name.length > 20
                      ? `${roomBlock.name.slice(0, 20)}...`
                      : roomBlock.name}
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleRoomBlockEdit(roomBlock)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(roomBlock.id, "ROOM_BLOCK")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shifts Card */}
      <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5
              className="card-title"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "0",
              }}
            >
              Shifts
            </h5>
            <button
              onClick={handleShiftModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Shift
            </button>
          </div>

          <div className="row mt-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 400,
                      fontStyle: "normal",
                      fontSize: "14px",
                      lineHeight: "100%",
                      letterSpacing: "0",
                      cursor: "pointer",
                    }}
                    title={shift.name}
                  >
                    {shift.name.length > 20
                      ? `${shift.name.slice(0, 20)}...`
                      : shift.name}
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleShiftEdit(shift)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(shift.id, "SHIFT")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Working Location Type Card */}
      {/* <div
        className="card mt-5"
        style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}
      >
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5
              className="card-title"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "0",
              }}
            >
              Working Location Type
            </h5>
            <button
              onClick={handleWorkingTypeModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.hover)
              }
              onMouseLeave={(e) =>
                Object.assign(e.currentTarget.style, buttonStyles.base)
              }
            >
              New Type
            </button>
          </div>

          <div className="row mt-4">
            {workingTypes.map((workingType) => (
              <div key={workingType.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 400,
                      fontStyle: "normal",
                      fontSize: "14px",
                      lineHeight: "100%",
                      letterSpacing: "0",
                      cursor: "pointer",
                    }}
                    title={workingType.name}
                  >
                    {workingType.name.length > 20
                      ? `${workingType.name.slice(0, 20)}...`
                      : workingType.name}
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleWorkingTypeEdit(workingType)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleDelete(workingType.id, "WORKING_TYPE")}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* Modals */}
      {/* Room Block Modal */}
      <OrganizationConfigureForm
        show={showRoomBlockModal}
        onClose={handleRoomBlockModalClose}
        onSuccess={fetchRoomBlocks}
        initialData={editingRoomBlock}
        isEditing={!!editingRoomBlock}
        type="ROOM_BLOCK"
        title="Room/Block"
      />

      {/* Shift Modal */}
      <OrganizationConfigureForm
        show={showShiftModal}
        onClose={handleShiftModalClose}
        onSuccess={fetchShifts}
        initialData={editingShift}
        isEditing={!!editingShift}
        type="SHIFT"
        title="Shift"
      />

      {/* Working Location Type Modal */}
      <OrganizationConfigureForm
        show={showWorkingTypeModal}
        onClose={handleWorkingTypeModalClose}
        onSuccess={fetchWorkingTypes}
        initialData={editingWorkingType}
        isEditing={!!editingWorkingType}
        type="WORKING_TYPE"
        title="Working Location Type"
      />
    </div>
  );
};

export default OrganizationConfigure;
